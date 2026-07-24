// Mission Ω-Canonical Integration. Pure — zero I/O, zero dependency on
// wall-clock inside the function itself (caller passes `now` explicitly),
// same discipline as ConfidenceEngine (learning-engine/) and every other
// pure decision function in this codebase.

export const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 60_000; // 1 minute
const MAX_DELAY_MS = 3_600_000; // 1 hour, cap

/** Exponential backoff with a ceiling — attempts=1 (first failure) -> ~2min,
 * growing to the 1h cap by attempts=6+. `attempts` is the count AFTER this
 * failure (i.e. already incremented), matching how the sweep service calls
 * this: attempts = entry.attempts + 1. */
export function computeBackoffDelayMs(attempts: number): number {
  const raw = Math.pow(2, attempts) * BASE_DELAY_MS;
  return Math.min(raw, MAX_DELAY_MS);
}

export function computeNextAttemptAt(attempts: number, now: Date = new Date()): string {
  return new Date(now.getTime() + computeBackoffDelayMs(attempts)).toISOString();
}

export function isDeadLetter(attempts: number): boolean {
  return attempts >= MAX_ATTEMPTS;
}
