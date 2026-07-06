import type { IExchangeRateRepository } from "../repositories/IExchangeRateRepository";
import type { CurrencyPair } from "../enums/CurrencyPair";
import type { ExchangeRate } from "../types/Money";

// Epic 4 — Exchange History. Thin read layer over the append-only
// exchange_rates table — no aggregation table, same "compute on demand"
// discipline as CanonicalPriceHistoryService.
export class ExchangeHistoryService {
  constructor(private readonly rateRepo: IExchangeRateRepository) {}

  getLatest(pair: CurrencyPair): Promise<ExchangeRate | null> {
    return this.rateRepo.getLatest(pair);
  }

  /** The rate in effect at a historical moment — used to keep converted
   * price_history charts internally consistent (never the rate "now"). */
  getRateAt(pair: CurrencyPair, at: Date): Promise<ExchangeRate | null> {
    return this.rateRepo.getRateAt(pair, at);
  }

  getRange(pair: CurrencyPair, from: Date, to: Date): Promise<ExchangeRate[]> {
    return this.rateRepo.getRange(pair, from, to);
  }
}
