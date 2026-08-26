import type { CanonicalMergeSuggestionService } from "@/src/domains/product-identity";
import { PRODUCT_IDENTITY_ALGORITHM_VERSION } from "@/src/domains/product-identity";
import type { ICanonicalSuggestionOutboxRepository } from "../repositories/ICanonicalSuggestionOutboxRepository";
import { computeNextAttemptAt, isDeadLetter, MAX_ATTEMPTS } from "./outbox/backoff";
import { computeAdaptiveBatchSize } from "./outbox/adaptiveBatch";
import { outboxMinBatchSize, outboxMaxBatchSize } from "./outbox/config";

export interface SweepResult {
  claimed: number;
  succeeded: number;
  retried: number;
  deadLettered: number;
  durationMs: number;
  throughputPerSecond: number;
  statusCounts: Record<string, number>;
  oldestPendingNextAttemptAt: string | null;
  /** Hotfix (2026-07-29): true when the item loop below stopped because
   * `deadlineAt` was reached before every claimed entry was processed —
   * the unprocessed remainder stays `processing` and self-heals through
   * the same staleClaimMs recovery path already used for a crashed
   * worker (see claimBatch's stale-claim reclaim), never a new mechanism. */
  stoppedForDeadline: boolean;
}

const DEFAULT_STALE_CLAIM_MS = 5 * 60_000; // 5 minutes
// Sprint 15C: quantas conclusões recentes amostrar para estimar a duração
// média por item. Mesmo tamanho de amostra que OutboxObservabilityService
// já usa para seus percentis — grande o bastante para não oscilar com um
// item atípico, pequeno o bastante para a consulta continuar barata.
const ADAPTIVE_THROUGHPUT_SAMPLE_SIZE = 50;

// Mission Ω-Canonical Integration. The sole consumer of
// canonical_suggestion_outbox — claims a bounded batch, calls
// CanonicalMergeSuggestionService.suggestMergesFor() (unmodified, Product
// Identity untouched), and finalizes each item under the outbox's AT LEAST
// ONCE DELIVERY contract: success -> done (permanent); failure with
// attempts left -> pending at a backed-off nextAttemptAt; failure exhausted
// -> dead_letter (permanent, never auto-requeued).
//
// suggestMergesFor() returns void — it does not report whether it created
// a candidate, rescored one, or no-op'd (0 candidates / below threshold).
// Distinguishing those outcomes would require changing Product Identity's
// public API, forbidden by this Mission's explicit restriction. This
// service therefore only ever reports succeeded/retried/deadLettered —
// an honest, smaller granularity than "sugestões criadas/re-pontuadas"
// discussed in Fase 1, documented as a known limitation, not silently
// claimed.
export class CanonicalSuggestionSweepService {
  constructor(
    private readonly outboxRepo: ICanonicalSuggestionOutboxRepository,
    private readonly mergeSuggestionService: CanonicalMergeSuggestionService
  ) {}

  /** Mission Ω-Hardening: `batchLimit` is now optional. Every existing
   * caller that passes an explicit value (this Mission's own tests, the
   * merge-suggestions cron before this Mission) gets EXACTLY that value,
   * unchanged — sweep()'s claim/process/finalize semantics and idempotency
   * guarantees are identical either way. Omitting it computes an adaptive
   * size from current backlog + recent throughput (never alters what
   * happens to a claimed item, only how many are claimed at once).
   *
   * Hotfix (2026-07-29): `deadlineAt` is a 4th optional parameter (epoch
   * ms). Every existing caller omits it and is completely unaffected —
   * without it the loop below processes every claimed entry exactly as
   * before. When passed, the item loop checks it before starting each
   * entry (never mid-entry) and stops claiming the caller's time budget
   * further; entries not yet started when the deadline hits stay
   * `processing` and are picked up by the next sweep once staleClaimMs
   * elapses — the exact recovery path this outbox already guarantees for
   * a worker that dies mid-batch, not a new contract. */
  async sweep(batchLimit?: number, staleClaimMs: number = DEFAULT_STALE_CLAIM_MS, deadlineAt?: number): Promise<SweepResult> {
    const startedAt = Date.now();
    // Sprint 15C: o orçamento restante é justamente o que faltava ao
    // dimensionamento. `deadlineAt` já era conhecido aqui — só não era
    // usado para decidir QUANTOS itens reivindicar, apenas para parar de
    // processá-los. Um chamador sem deadline (todo teste e todo uso
    // anterior a esta Sprint) passa `undefined` e mantém o cálculo antigo.
    const effectiveBatchLimit = batchLimit ?? (await this.computeAdaptiveLimit(deadlineAt === undefined ? undefined : deadlineAt - startedAt));
    const entries = await this.outboxRepo.claimBatch(effectiveBatchLimit, staleClaimMs);

    let succeeded = 0;
    let retried = 0;
    let deadLettered = 0;
    let stoppedForDeadline = false;

    for (const entry of entries) {
      if (deadlineAt !== undefined && Date.now() >= deadlineAt) {
        stoppedForDeadline = true;
        break;
      }
      try {
        await this.mergeSuggestionService.suggestMergesFor(entry.canonicalProductId);
        await this.outboxRepo.markDone(entry.id, PRODUCT_IDENTITY_ALGORITHM_VERSION);
        succeeded++;
      } catch (err) {
        const attempts = entry.attempts + 1;
        const lastError = String(err);
        if (isDeadLetter(attempts)) {
          await this.outboxRepo.markDeadLetter(entry.id, { attempts, lastError, algorithmVersion: PRODUCT_IDENTITY_ALGORITHM_VERSION });
          deadLettered++;
        } else {
          await this.outboxRepo.markFailedForRetry(entry.id, {
            attempts,
            nextAttemptAt: computeNextAttemptAt(attempts),
            lastError,
            algorithmVersion: PRODUCT_IDENTITY_ALGORITHM_VERSION,
          });
          retried++;
        }
      }
    }

    const durationMs = Date.now() - startedAt;
    const [statusCounts, oldestPendingNextAttemptAt] = await Promise.all([
      this.outboxRepo.countByStatus(),
      this.outboxRepo.oldestPendingNextAttemptAt(),
    ]);

    const processedCount = succeeded + retried + deadLettered;

    return {
      claimed: entries.length,
      succeeded,
      retried,
      deadLettered,
      durationMs,
      // processedCount, not entries.length: when stoppedForDeadline leaves
      // part of the claimed batch untouched, throughput must reflect what
      // actually ran, not what was merely claimed.
      throughputPerSecond: durationMs > 0 ? processedCount / (durationMs / 1000) : processedCount,
      statusCounts,
      oldestPendingNextAttemptAt,
      stoppedForDeadline,
    };
  }

  // Sprint 15C. A fonte do sinal de throughput mudou de `countCompletedSince`
  // para `recentCompletionSamples` — MESMA quantidade de consultas (duas, em
  // paralelo), método de repositório que já existia (OutboxObservabilityService
  // o usa desde a Mission Ω-Hardening), nenhum contrato novo.
  //
  // Por quê: `countCompletedSince` divide as conclusões pela janela INTEIRA
  // de 5 minutos. Como o trabalho é em rajada — o cron roda, trabalha 45s e
  // dorme 15 minutos — 30 itens concluídos em 45s eram reportados como
  // 6/min em vez dos ~40/min reais, subestimando a capacidade em ~7x. Pior:
  // no primeiro sweep de cada invocação a janela está sempre vazia (última
  // execução foi há 15 minutos), então o sinal era estruturalmente ZERO.
  //
  // A duração média por item (`completedAt - claimedAt`) é a grandeza
  // fisicamente correta para responder "quantos cabem no orçamento": não
  // depende de quando o trabalho aconteceu, só de quanto cada item custa.
  private async computeAdaptiveLimit(budgetMs?: number): Promise<number> {
    const [statusCounts, samples] = await Promise.all([
      this.outboxRepo.countByStatus(),
      this.outboxRepo.recentCompletionSamples(ADAPTIVE_THROUGHPUT_SAMPLE_SIZE),
    ]);
    const backlogRemaining = (statusCounts.pending ?? 0) + (statusCounts.processing ?? 0);

    const durations = samples
      .map((s) => new Date(s.completedAt).getTime() - new Date(s.claimedAt).getTime())
      .filter((ms) => Number.isFinite(ms) && ms > 0);
    const averageItemMs = durations.length > 0 ? durations.reduce((sum, ms) => sum + ms, 0) / durations.length : 0;

    // Sem amostra utilizável, throughput 0 — exatamente o "cold start" que
    // computeAdaptiveBatchSize já tratava, e continua tratando.
    const throughputPerMinute = averageItemMs > 0 ? 60_000 / averageItemMs : 0;

    return computeAdaptiveBatchSize(backlogRemaining, throughputPerMinute, outboxMinBatchSize(), outboxMaxBatchSize(), budgetMs);
  }
}

export { MAX_ATTEMPTS };
