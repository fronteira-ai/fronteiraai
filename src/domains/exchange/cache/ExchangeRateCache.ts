import type { CurrencyPair } from "../enums/CurrencyPair";
import type { ExchangeRate } from "../types/Money";

// Epic 3 — Exchange Cache Engine. "Warm/cold cache" from the brief collapses
// to a single tier here: a valid in-memory entry ("warm"), or a miss/expiry
// that falls through to the exchange_rates table itself (the DB row is
// never more than ~5 minutes stale, refreshed by the cron job) — there is no
// second, separate "cold" tier because the database already fills that role
// cheaply. Building a distinct cold-tier store (e.g. a second cache backend)
// would be complexity with no product benefit (NORTH_STAR.md §7).
//
// Known, documented limitation: this is a per-process in-memory Map, not
// shared across Vercel serverless instances (same caveat already accepted
// for the analytics rate limiter in app/api/analytics/events/route.ts).
// This is harmless here because every instance's worst case is falling
// through to the DB row, which is itself bounded to ~5 minutes of staleness
// regardless of which instance serves the request — the cache only trims
// the common-case DB round-trip, it isn't the source of truth for freshness.
const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  rate: ExchangeRate;
  expiresAt: number;
}

export class ExchangeRateCache {
  private readonly entries = new Map<CurrencyPair, CacheEntry>();

  get(pair: CurrencyPair): ExchangeRate | null {
    const entry = this.entries.get(pair);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.entries.delete(pair);
      return null;
    }
    return entry.rate;
  }

  set(rate: ExchangeRate): void {
    this.entries.set(rate.pair, { rate, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  clear(): void {
    this.entries.clear();
  }
}

export const EXCHANGE_RATE_CACHE_TTL_MS = CACHE_TTL_MS;
