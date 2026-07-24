import type { ICanonicalSuggestionOutboxRepository } from "../../repositories/ICanonicalSuggestionOutboxRepository";
import type { StageMetrics } from "../../types/pipeline.types";

export interface CanonicalLinkStageSummary {
  offersProcessed: number;
  linksSucceeded: number;
  bootstrapFailures: number;
  linkFailures: number;
  successRate: number | null;
  failureRate: number | null;
}

export interface OutboxMetricsSnapshot {
  // Queue composition
  queueSizeTotal: number;
  queueSizeActive: number; // pending + processing
  pending: number;
  processing: number;
  retrying: number; // pending sub-state (attempts > 0) — see domain doc comment
  deadLetter: number;
  expired: number;
  done: number;

  // Rates (0..1, null when there is no terminal population yet)
  retryRate: number | null;
  deadLetterRate: number | null;

  // Attempts / timing
  averageRetryCount: number;
  averageProcessingTimeMs: number | null;
  p95ProcessingTimeMs: number | null;
  p99ProcessingTimeMs: number | null;

  // Throughput
  queueDrainRatePerMinute: number; // == "Items por minuto"
  backlogRemaining: number;
  estimatedCompletionMinutes: number | null; // null when throughput is 0 (would be Infinity)

  // Mission Ω-Hardening honesty note (see class doc comment): these two
  // measure outbox EVALUATION outcomes, not literally "candidate created
  // vs rejected by the algorithm" — suggestMergesFor() returns void and
  // cannot be introspected without altering Product Identity (forbidden).
  suggestionsGenerated: number; // done count
  suggestionsSkipped: number; // deadLetter + expired count

  oldestPendingNextAttemptAt: string | null;
}

const PROCESSING_TIME_SAMPLE_SIZE = 1000;
const DRAIN_RATE_WINDOW_MS = 15 * 60_000; // 15 minutes — matches the merge-suggestions cron cadence

function percentile(sortedMs: number[], p: number): number | null {
  if (sortedMs.length === 0) return null;
  const idx = Math.min(sortedMs.length - 1, Math.floor(p * (sortedMs.length - 1)));
  return sortedMs[idx];
}

// Mission Ω-Hardening. Single place every centralized outbox metric is
// computed — cron routes/logs call this instead of each re-deriving counts
// from the repository independently ("não duplicar lógica").
export class OutboxObservabilityService {
  constructor(private readonly outboxRepo: ICanonicalSuggestionOutboxRepository) {}

  async snapshot(): Promise<OutboxMetricsSnapshot> {
    const [statusCounts, retrying, averageRetryCount, samples, drainWindow, oldestPendingNextAttemptAt] = await Promise.all([
      this.outboxRepo.countByStatus(),
      this.outboxRepo.countRetrying(),
      this.outboxRepo.averageAttempts(["done", "dead_letter", "expired"]),
      this.outboxRepo.recentCompletionSamples(PROCESSING_TIME_SAMPLE_SIZE),
      this.outboxRepo.countCompletedSince(new Date(Date.now() - DRAIN_RATE_WINDOW_MS).toISOString()),
      this.outboxRepo.oldestPendingNextAttemptAt(),
    ]);

    const pending = statusCounts.pending ?? 0;
    const processing = statusCounts.processing ?? 0;
    const deadLetter = statusCounts.dead_letter ?? 0;
    const expired = statusCounts.expired ?? 0;
    const done = statusCounts.done ?? 0;
    const queueSizeActive = pending + processing;
    const queueSizeTotal = queueSizeActive + done + deadLetter + expired + (statusCounts.failed ?? 0);
    const terminalTotal = done + deadLetter + expired;

    const processingTimesMs = samples
      .map((s) => new Date(s.completedAt).getTime() - new Date(s.claimedAt).getTime())
      .filter((ms) => Number.isFinite(ms) && ms >= 0)
      .sort((a, b) => a - b);
    const averageProcessingTimeMs = processingTimesMs.length > 0 ? processingTimesMs.reduce((a, b) => a + b, 0) / processingTimesMs.length : null;

    const drainCount = drainWindow.done + drainWindow.deadLetter + drainWindow.expired;
    const queueDrainRatePerMinute = drainCount / (DRAIN_RATE_WINDOW_MS / 60_000);

    return {
      queueSizeTotal,
      queueSizeActive,
      pending,
      processing,
      retrying,
      deadLetter,
      expired,
      done,
      retryRate: terminalTotal + queueSizeActive > 0 ? retrying / (terminalTotal + queueSizeActive) : null,
      deadLetterRate: terminalTotal > 0 ? deadLetter / terminalTotal : null,
      averageRetryCount,
      averageProcessingTimeMs,
      p95ProcessingTimeMs: percentile(processingTimesMs, 0.95),
      p99ProcessingTimeMs: percentile(processingTimesMs, 0.99),
      queueDrainRatePerMinute,
      backlogRemaining: queueSizeActive,
      estimatedCompletionMinutes: queueDrainRatePerMinute > 0 ? queueSizeActive / queueDrainRatePerMinute : null,
      suggestionsGenerated: done,
      suggestionsSkipped: deadLetter + expired,
      oldestPendingNextAttemptAt,
    };
  }
}

/** Pure — reads a "canonical-link" StageMetrics entry (Mission
 * Ω-Canonical Integration's `details` bag) out of a PipelineMetrics.stages
 * array a caller already has (e.g. a SyncRunOutcome). Never wired into any
 * live route by this Mission (CanonicalLinkStage/SyncOrchestrator stay
 * untouched) — a ready, tested utility for a future Mission's wiring
 * decision, same "foundation now, wiring later" precedent already used
 * repeatedly in this codebase (Marketplace Memory, Ω-5). */
export function summarizeCanonicalLinkStageMetrics(stages: StageMetrics[]): CanonicalLinkStageSummary | null {
  const stage = stages.find((s) => s.stage === "canonical-link");
  if (!stage || !stage.details) return null;

  const offersProcessed = stage.details.offersProcessed ?? 0;
  const linksSucceeded = stage.details.linksSucceeded ?? 0;
  const bootstrapFailures = stage.details.bootstrapFailures ?? 0;
  const linkFailures = stage.details.linkFailures ?? 0;

  return {
    offersProcessed,
    linksSucceeded,
    bootstrapFailures,
    linkFailures,
    successRate: offersProcessed > 0 ? linksSucceeded / offersProcessed : null,
    failureRate: offersProcessed > 0 ? (bootstrapFailures + linkFailures) / offersProcessed : null,
  };
}
