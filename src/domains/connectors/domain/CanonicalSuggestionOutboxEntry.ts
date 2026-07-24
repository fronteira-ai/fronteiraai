// Mission Ω-Canonical Integration. Transactional Outbox entry — never
// UPDATEd past its terminal state ('done'/'dead_letter'/'expired' are
// permanent), same audit-trail discipline as merge_executions/knowledge_history.
//
// Mission Ω-Hardening: 'expired' added — an item that stayed in an active
// retry cycle (status='pending', attempts>0) longer than MAX_RETRY_AGE_DAYS,
// measured from enqueuedAt. A safety net independent of and complementary
// to attempts-based dead-lettering, never a replacement for it. "retry" as
// named in this Mission's brief is not a fifth DB status — it is the
// existing 'pending' status with attempts>0, exactly as it already worked
// before this Mission (kept unchanged to avoid an unrequested state-machine
// rename).
export type CanonicalSuggestionOutboxStatus = "pending" | "processing" | "done" | "failed" | "dead_letter" | "expired";

/** Mission Ω-Hardening. Default NORMAL preserves every pre-existing
 * enqueue() call's behavior unchanged — see ConfidenceEngine-style
 * additive-constant precedent used throughout this codebase. */
export type CanonicalSuggestionPriority = "high" | "normal" | "low";

/** Declaration order IS the priority order — high first, low last. Single
 * source of truth for both the in-memory claim sort and any future
 * observability breakdown, never duplicated. */
export const PRIORITY_RANK: Record<CanonicalSuggestionPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

export interface CanonicalSuggestionOutboxEntry {
  id: string;
  canonicalProductId: string;
  status: CanonicalSuggestionOutboxStatus;
  priority: CanonicalSuggestionPriority;
  attempts: number;
  lastError: string | null;
  lastAttemptedAt: string | null;
  nextAttemptAt: string;
  claimedAt: string | null;
  /** PRODUCT_IDENTITY_ALGORITHM_VERSION used on the last real processing
   * attempt — null until the first attempt. Same name/semantics as
   * merge_candidates.algorithm_version (Fase 1, refinamento 1) — never a
   * parallel "worker version" concept. */
  algorithmVersion: string | null;
  /** "{connectorId}:{batchId}" — which sync enqueued this item. */
  source: string;
  enqueuedAt: string;
  completedAt: string | null;
  createdAt: string;
}
