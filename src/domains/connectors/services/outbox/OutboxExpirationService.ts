import type { ICanonicalSuggestionOutboxRepository } from "../../repositories/ICanonicalSuggestionOutboxRepository";
import { maxRetryAgeDays } from "./config";

export interface ExpirationResult {
  expiredCount: number;
  durationMs: number;
  cutoffIso: string;
  maxRetryAgeDays: number;
}

// Mission Ω-Hardening. A safety net complementary to (never a replacement
// for) attempts-based dead-lettering: MAX_ATTEMPTS=5 with exponential
// backoff capped at 1h already moves a persistently-failing item to
// dead_letter within roughly an hour of its first failure — under today's
// parameters this service is expected to find ~0 candidates. Its value is
// as an OUTER bound, independent of attempts count, that stays correct
// even if MAX_ATTEMPTS/backoff parameters change later, or if some future
// bug leaves an item 'pending' without ever being claimed (a stuck
// next_attempt_at, a claim-logic regression) — this is the mechanism that
// still catches it after MAX_RETRY_AGE_DAYS, explicit and visible
// (status='expired'), never silent.
//
// Moves only status='pending' rows (the "retry" population, whether
// attempts=0 or >0 — age is measured from enqueuedAt, not from the last
// attempt) — never touches processing/done/dead_letter/already-expired.
export class OutboxExpirationService {
  constructor(private readonly outboxRepo: ICanonicalSuggestionOutboxRepository) {}

  async expireStaleRetries(): Promise<ExpirationResult> {
    const startedAt = Date.now();
    const days = maxRetryAgeDays();
    const cutoffIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const expiredCount = await this.outboxRepo.expireStaleRetries(cutoffIso, `expired: exceeded MAX_RETRY_AGE_DAYS (${days} days) since enqueued`);

    return { expiredCount, durationMs: Date.now() - startedAt, cutoffIso, maxRetryAgeDays: days };
  }
}
