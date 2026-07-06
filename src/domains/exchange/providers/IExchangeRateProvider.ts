import type { RawRateQuote } from "../types/Money";

export interface IExchangeRateProvider {
  readonly id: string;
  readonly name: string;
  /** Lower number is tried first — ExchangeRateService.refresh() iterates in this order. */
  readonly priority: number;
  fetchRates(): Promise<RawRateQuote[]>;
}
