// Mission Ω-Hardening. Every value read at CALL time (never cached in a
// module-level constant) so an operator can change behavior via env var
// without a redeploy — the exact precedent already established by
// CanonicalMergeSuggestionService's rolloutPercent()/paritySamplePercent()
// (product-identity/services/CanonicalMergeSuggestionService.ts).

function readIntEnv(name: string, defaultValue: number, min: number, max: number): number {
  const raw = process.env[name];
  const parsed = raw !== undefined ? parseInt(raw, 10) : defaultValue;
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.min(max, Math.max(min, parsed));
}

/** How many days a `done` outbox row is kept before OutboxRetentionService
 * deletes it. Never applies to pending/processing/dead_letter/expired. */
export function outboxRetentionDays(): number {
  return readIntEnv("OUTBOX_RETENTION_DAYS", 180, 1, 3650);
}

/** How many days an item may remain in an active retry cycle (status
 * 'pending', measured from enqueuedAt — independent of attempts count)
 * before OutboxExpirationService moves it to 'expired'. A safety net
 * complementary to MAX_ATTEMPTS-based dead-lettering, not a replacement. */
export function maxRetryAgeDays(): number {
  return readIntEnv("MAX_RETRY_AGE_DAYS", 30, 1, 365);
}

/** Bounds for CanonicalSuggestionSweepService's adaptive batch sizing —
 * only used when a caller does not pass an explicit batchLimit (backward
 * compatible: every existing explicit-argument call is unaffected). */
export function outboxMinBatchSize(): number {
  return readIntEnv("OUTBOX_MIN_BATCH_SIZE", 10, 1, 1000);
}

export function outboxMaxBatchSize(): number {
  return readIntEnv("OUTBOX_MAX_BATCH_SIZE", 200, 1, 5000);
}
