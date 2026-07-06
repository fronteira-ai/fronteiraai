import type { CurrencyPair } from "../enums/CurrencyPair";
import type { ExchangeRate } from "../types/Money";

export interface CreateExchangeRateInput {
  pair: CurrencyPair;
  rate: number;
  source: string;
}

export interface IExchangeRateRepository {
  /** Always an INSERT — exchange_rates is append-only, a rate is never updated in place. */
  insert(input: CreateExchangeRateInput): Promise<ExchangeRate | null>;
  getLatest(pair: CurrencyPair): Promise<ExchangeRate | null>;
  /** The rate in effect at or before `at` — for historical price_history consistency. */
  getRateAt(pair: CurrencyPair, at: Date): Promise<ExchangeRate | null>;
  getRange(pair: CurrencyPair, from: Date, to: Date): Promise<ExchangeRate[]>;
}
