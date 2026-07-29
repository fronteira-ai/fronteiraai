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
const ADAPTIVE_THROUGHPUT_WINDOW_MS = 5 * 60_000; // 5 minutes — recent-throughput sample window

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
    const effectiveBatchLimit = batchLimit ?? (await this.computeAdaptiveLimit());
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

  private async computeAdaptiveLimit(): Promise<number> {
    const [statusCounts, recentCompletions] = await Promise.all([
      this.outboxRepo.countByStatus(),
      this.outboxRepo.countCompletedSince(new Date(Date.now() - ADAPTIVE_THROUGHPUT_WINDOW_MS).toISOString()),
    ]);
    const backlogRemaining = (statusCounts.pending ?? 0) + (statusCounts.processing ?? 0);
    const recentTotal = recentCompletions.done + recentCompletions.deadLetter + recentCompletions.expired;
    const throughputPerMinute = recentTotal / (ADAPTIVE_THROUGHPUT_WINDOW_MS / 60_000);
    return computeAdaptiveBatchSize(backlogRemaining, throughputPerMinute, outboxMinBatchSize(), outboxMaxBatchSize());
  }
}

export { MAX_ATTEMPTS };
