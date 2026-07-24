import type { CanonicalSuggestionOutboxEntry, CanonicalSuggestionOutboxStatus, CanonicalSuggestionPriority } from "../domain/CanonicalSuggestionOutboxEntry";

export interface MarkFailedForRetryInput {
  attempts: number;
  nextAttemptAt: string;
  lastError: string;
  algorithmVersion: string | null;
}

export interface MarkDeadLetterInput {
  attempts: number;
  lastError: string;
  algorithmVersion: string | null;
}

export interface CompletionSample {
  claimedAt: string;
  completedAt: string;
}

export interface CompletionWindowCounts {
  done: number;
  deadLetter: number;
  expired: number;
}

export interface ICanonicalSuggestionOutboxRepository {
  /** Idempotent — a no-op when an active (pending/processing) entry
   * already exists for this canonicalProductId (enforced by the DB's
   * partial UNIQUE index, the actual source of truth; the app-level check
   * is only an optimization to skip the common-case round trip).
   * `priority` is optional and defaults to 'normal' — every pre-existing
   * 2-argument call (CanonicalLinkStage) is byte-identical in behavior;
   * this is how a future connector could request a different priority
   * without any architectural change. */
  enqueue(canonicalProductId: string, source: string, priority?: CanonicalSuggestionPriority): Promise<void>;

  /** Two-step, race-safe claim (Fase 1): selects due `pending` rows plus
   * `processing` rows whose claim is stale (claimedAt older than
   * staleClaimMs), orders candidates by priority (high first) then
   * createdAt (Mission Ω-Hardening — ordering only, never changes which
   * rows are eligible), then a conditional UPDATE that only succeeds for
   * rows still in a claimable status — safe against two overlapping sweep
   * runs claiming the same row, without FOR UPDATE SKIP LOCKED or a custom
   * RPC. */
  claimBatch(limit: number, staleClaimMs: number): Promise<CanonicalSuggestionOutboxEntry[]>;

  /** Terminal success — never reverted, completedAt stamped, row kept as
   * audit history (never deleted, same discipline as merge_executions). */
  markDone(id: string, algorithmVersion: string): Promise<void>;

  /** Non-terminal failure — returns the entry to 'pending' at the
   * computed backoff time. Retrying is expected behavior under this
   * outbox's AT LEAST ONCE DELIVERY contract, never an error condition. */
  markFailedForRetry(id: string, input: MarkFailedForRetryInput): Promise<void>;

  /** Terminal failure after MAX_ATTEMPTS — explicit, visible, never
   * silently re-attempted. The row stays queryable for operator
   * inspection; it is never auto-requeued. */
  markDeadLetter(id: string, input: MarkDeadLetterInput): Promise<void>;

  /** Observability — count per status (now including 'expired'), for the
   * sweep's own regression signal (dead_letter is the primary alarm). */
  countByStatus(): Promise<Record<CanonicalSuggestionOutboxStatus, number>>;

  /** Age of the oldest still-pending item's nextAttemptAt — a growing
   * value signals the sweep cron stopped running. Null when there are no
   * pending rows. */
  oldestPendingNextAttemptAt(): Promise<string | null>;

  // ── Mission Ω-Hardening ──────────────────────────────────────────────

  /** Count of 'pending' rows with attempts > 0 — the "retry" population
   * this Mission's brief refers to (a sub-state of 'pending', not a
   * separate DB status — see CanonicalSuggestionOutboxStatus's own doc
   * comment). */
  countRetrying(): Promise<number>;

  /** Mean `attempts` across the given terminal statuses — e.g.
   * ['done','dead_letter','expired'] for "Average Retry Count". */
  averageAttempts(statuses: CanonicalSuggestionOutboxStatus[]): Promise<number>;

  /** Up to `limit` most recent 'done' rows' (claimedAt, completedAt) pairs
   * — the raw sample OutboxObservabilityService computes average/P95/P99
   * processing time from (percentiles need raw samples, not a single SQL
   * aggregate PostgREST can express). */
  recentCompletionSamples(limit: number): Promise<CompletionSample[]>;

  /** How many rows reached done/dead_letter/expired since `sinceIso` — the
   * throughput window "Queue Drain Rate"/"Items por minuto" is computed
   * from. */
  countCompletedSince(sinceIso: string): Promise<CompletionWindowCounts>;

  /** OutboxRetentionService's only write — deletes status='done' rows with
   * createdAt < cutoffIso. Never touches pending/processing/dead_letter/
   * expired (enforced by the WHERE clause, not just documentation).
   * Returns the number of rows actually deleted. */
  deleteDoneOlderThan(cutoffIso: string): Promise<number>;

  /** OutboxExpirationService's only write — moves 'pending' rows whose
   * enqueuedAt < cutoffIso to 'expired', recording `reason` as the
   * (reused) lastError field. Never touches processing/done/dead_letter/
   * already-expired rows. Returns the number of rows expired. */
  expireStaleRetries(cutoffIso: string, reason: string): Promise<number>;
}
