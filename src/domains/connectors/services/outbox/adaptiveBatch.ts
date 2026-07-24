// Mission Ω-Hardening. Pure — zero I/O, same discipline as backoff.ts.
//
// Scales the claim batch size with backlog pressure: a small backlog uses
// a small batch (avoid over-fetching when there's nothing to gain), a
// large backlog grows the batch toward maxBatch (drain faster) — but never
// beyond what recent throughput suggests can be usefully processed within
// one sweep call, and always clamped to [minBatch, maxBatch]. Never alters
// per-item processing semantics or idempotency — this function only
// decides HOW MANY rows claimBatch() asks for, never what happens to each
// claimed row (unchanged: claim → suggestMergesFor → done/retry/dead_letter).

export function computeAdaptiveBatchSize(backlogRemaining: number, recentThroughputPerMinute: number, minBatch: number, maxBatch: number): number {
  if (backlogRemaining <= 0) return minBatch;

  // Target ~1 minute of work per sweep call when we have a throughput
  // signal; fall back to scaling directly with backlog when we don't
  // (cold start — no completions observed yet).
  const throughputTarget = recentThroughputPerMinute > 0 ? Math.ceil(recentThroughputPerMinute) : Math.ceil(backlogRemaining / 10);

  const target = Math.min(backlogRemaining, throughputTarget);
  return Math.min(maxBatch, Math.max(minBatch, target));
}
