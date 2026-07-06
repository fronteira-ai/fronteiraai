import { CurrencyPair } from "../enums/CurrencyPair";
import type { ExchangeProviderRegistryImpl } from "../providers/ExchangeProviderRegistry";
import type { IExchangeRateRepository } from "../repositories/IExchangeRateRepository";
import type { IExchangeProviderRunRepository } from "../repositories/IExchangeProviderRunRepository";
import type { ExchangeRateCache } from "../cache/ExchangeRateCache";
import type { ExchangeRate, RawRateQuote } from "../types/Money";

export interface RefreshResult {
  rates: ExchangeRate[];
  usingFallback: boolean;
  /** id of the provider that actually supplied the rates, null when every provider failed */
  providerId: string | null;
}

const TRACKED_PAIRS = [CurrencyPair.UsdPyg, CurrencyPair.UsdBrl, CurrencyPair.BrlPyg];

// Epic 2 — the failover mechanism is real and N-provider-capable even
// though only one provider is registered this Wave (ADR-043). Adding a
// second provider later is purely additive (registry.register(...)) — no
// change needed here.
export class ExchangeRateService {
  constructor(
    private readonly registry: ExchangeProviderRegistryImpl,
    private readonly rateRepo: IExchangeRateRepository,
    private readonly runRepo: IExchangeProviderRunRepository,
    private readonly cache: ExchangeRateCache
  ) {}

  async refresh(): Promise<RefreshResult> {
    for (const provider of this.registry.list()) {
      const startedAt = Date.now();
      try {
        const quotes = await provider.fetchRates();
        const responseTimeMs = Date.now() - startedAt;
        await this.runRepo.create({ providerId: provider.id, status: "success", responseTimeMs, errorMessage: null });

        const rates = await this.persistAndTriangulate(quotes, provider.id);
        return { rates, usingFallback: false, providerId: provider.id };
      } catch (err) {
        const responseTimeMs = Date.now() - startedAt;
        const errorMessage = err instanceof Error ? err.message : String(err);
        await this.runRepo.create({ providerId: provider.id, status: "failure", responseTimeMs, errorMessage });
        // fall through to the next provider in priority order
      }
    }

    return this.degradeToLastKnownGood();
  }

  /** Cache-first read path used by AutomaticCurrencyService for "current" rates. */
  async getCurrentRate(pair: CurrencyPair): Promise<ExchangeRate | null> {
    const cached = this.cache.get(pair);
    if (cached) return cached;

    const fromDb = await this.rateRepo.getLatest(pair);
    if (fromDb) this.cache.set(fromDb);
    return fromDb;
  }

  private async persistAndTriangulate(quotes: RawRateQuote[], source: string): Promise<ExchangeRate[]> {
    const inserted: ExchangeRate[] = [];

    for (const quote of quotes) {
      const rate = await this.rateRepo.insert({ pair: quote.pair, rate: quote.rate, source });
      if (rate) {
        inserted.push(rate);
        this.cache.set(rate);
      }
    }

    const usdPyg = quotes.find((q) => q.pair === CurrencyPair.UsdPyg);
    const usdBrl = quotes.find((q) => q.pair === CurrencyPair.UsdBrl);
    if (usdPyg && usdBrl && usdBrl.rate > 0) {
      const brlPygRate = usdPyg.rate / usdBrl.rate;
      const rate = await this.rateRepo.insert({ pair: CurrencyPair.BrlPyg, rate: brlPygRate, source });
      if (rate) {
        inserted.push(rate);
        this.cache.set(rate);
      }
    }

    return inserted;
  }

  // Every registered provider failed — never fabricate a new exchange_rates
  // row on failure (Anti-Pattern 5, INSERT-only integrity). Read whatever is
  // already the most recent row per pair and serve that, flagged as a
  // fallback so callers can surface staleness honestly.
  private async degradeToLastKnownGood(): Promise<RefreshResult> {
    const fallbackRates = await Promise.all(TRACKED_PAIRS.map((pair) => this.rateRepo.getLatest(pair)));
    const rates = fallbackRates.filter((r): r is ExchangeRate => r !== null);
    for (const rate of rates) this.cache.set(rate);

    return { rates, usingFallback: true, providerId: null };
  }
}
