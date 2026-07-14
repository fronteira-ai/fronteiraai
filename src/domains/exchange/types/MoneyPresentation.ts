import type { Currency } from "../enums/Currency";
import type { CurrencyPair } from "../enums/CurrencyPair";

// Program ΔR — Mission ΔR-1.2 (Universal Price Presentation). The single
// object every screen that shows money must consume — never construct
// itself. Every field here is already resolved (converted, rounded,
// formatted) by PricePresentationService; a component only ever reads
// these fields, never `.toFixed()`s or `Intl.NumberFormat`s on its own.
export interface MoneyPresentation {
  amountUSD: number;
  /** null exactly when no BRL figure could be produced — either no
   * exchange rate was available (never fabricated) or the caller never
   * asked for a BRL figure at all (see PresentMoneyInput.skipBRL). Never
   * omit the field; a missing BRL is a fact to show ("—"), not to hide. */
  amountBRL: number | null;
  currencyPair: CurrencyPair | null;
  exchangeRate: number | null;
  /** id of the provider that supplied the rate — null when amountBRL is
   * null, or when the rate came from an independently-known amount
   * (see PresentMoneyInput.knownAmountBRL) rather than a live conversion. */
  provider: string | null;
  /** ISO timestamp of the rate actually used — null under the same
   * conditions as `provider`. */
  capturedAt: string | null;
  /** ISO timestamp of when this MoneyPresentation was produced. */
  presentedAt: string;
  /** true when the rate behind amountBRL is older than the platform's
   * staleness threshold, or when every provider failed and a last-known-good
   * rate was used — surfaced honestly, never hidden (Objetivo 5). */
  isStale: boolean;
  formattedUSD: string;
  /** null under the same conditions as amountBRL. */
  formattedBRL: string | null;
  /** e.g. "1 USD = R$ 5,42" — null when there's no rate to show. */
  formattedRate: string | null;
  /** e.g. "Atualizado há 3 min" / "Cotação desatualizada" — always present,
   * even when amountBRL is null (explains why). */
  formattedTimestamp: string;
}

export interface MoneySavingsPresentation {
  amountUSD: number;
  amountBRL: number | null;
  percent: number;
  formattedUSD: string;
  formattedBRL: string | null;
  formattedPercent: string;
}

export interface PresentMoneyInput {
  amountUSD: number;
  /** Objetivo 3 audit finding, ADR-009: `offers.price_brl` is an
   * independent, merchant-entered value — never derived from the exchange
   * rate. When the caller already has a real, independently-sourced BRL
   * amount, pass it here so PricePresentationService never overwrites a
   * real observed price with a computed estimate. Omitting this triggers a
   * live conversion via AutomaticCurrencyService instead. */
  knownAmountBRL?: number;
  /** Historical consistency (e.g. a price_history chart point) — omit for "now". */
  at?: Date;
  targetCurrency?: Currency;
}

export interface PresentSavingsInput {
  amountUSD: number;
  percent: number;
  knownAmountBRL?: number;
}
