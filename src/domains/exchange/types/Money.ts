import type { CurrencyPair } from "../enums/CurrencyPair";

// A single captured rate — INSERT-only in the database (exchange_rates),
// this is the read-side shape.
export interface ExchangeRate {
  pair: CurrencyPair;
  rate: number;
  source: string;
  capturedAt: string; // ISO timestamp
}

// What a provider adapter returns before triangulation/persistence.
export interface RawRateQuote {
  pair: CurrencyPair;
  rate: number;
}
