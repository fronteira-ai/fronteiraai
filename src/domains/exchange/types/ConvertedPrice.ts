import type { Currency } from "../enums/Currency";
import type { CurrencyPair } from "../enums/CurrencyPair";

// "Versão da Cotação" (brief, Epic 5) is the exact exchange_rates row used —
// not a synthetic version number. Fully explainable, no schema bloat.
export interface RateVersion {
  pair: CurrencyPair;
  capturedAt: string;
  source: string;
}

export interface ConvertedPrice {
  originalPrice: number;
  originalCurrency: Currency;
  targetCurrency: Currency;
  rateUsed: number;
  convertedPrice: number;
  conversionDate: string;
  /** null only for the same-currency shortcut (rateUsed = 1, no rate row involved) */
  rateVersion: RateVersion | null;
  /** true when every registered provider failed and this used the last-known-good rate */
  usingFallback: boolean;
}
