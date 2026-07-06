import { Currency } from "../enums/Currency";
import { CurrencyPair } from "../enums/CurrencyPair";
import type { ExchangeRateService } from "./ExchangeRateService";
import type { ExchangeHistoryService } from "../history/ExchangeHistoryService";
import type { ConvertedPrice } from "../types/ConvertedPrice";
import type { ExchangeRate } from "../types/Money";

export interface ConvertInput {
  amountOriginal: number;
  currencyOriginal: Currency;
  targetCurrency: Currency;
  /** Omit for "now" (cache/latest DB row); provide for historical consistency (e.g. a price_history chart point). */
  at?: Date;
}

// A rate more than 3x the cron's 5-minute refresh cadence old means at least
// one refresh cycle was missed — surfaced honestly as `usingFallback`
// instead of silently presenting a stale rate as current.
const STALE_THRESHOLD_MS = 15 * 60 * 1000;

interface PairMapping {
  pair: CurrencyPair;
  invert: boolean;
}

// Only 3 currencies exist in this marketplace — a direct lookup is clearer
// than a generic currency-graph/pathfinding abstraction that has nothing
// real to solve for yet.
function pairFor(from: Currency, to: Currency): PairMapping | null {
  if (from === Currency.USD && to === Currency.PYG) return { pair: CurrencyPair.UsdPyg, invert: false };
  if (from === Currency.PYG && to === Currency.USD) return { pair: CurrencyPair.UsdPyg, invert: true };
  if (from === Currency.USD && to === Currency.BRL) return { pair: CurrencyPair.UsdBrl, invert: false };
  if (from === Currency.BRL && to === Currency.USD) return { pair: CurrencyPair.UsdBrl, invert: true };
  if (from === Currency.BRL && to === Currency.PYG) return { pair: CurrencyPair.BrlPyg, invert: false };
  if (from === Currency.PYG && to === Currency.BRL) return { pair: CurrencyPair.BrlPyg, invert: true };
  return null;
}

function isStale(rate: ExchangeRate): boolean {
  return Date.now() - new Date(rate.capturedAt).getTime() > STALE_THRESHOLD_MS;
}

// Epic 5 — Automatic Currency Engine. Reuses offers.currency as "Moeda
// Original" (already means this — see the deviation from the Blueprint's
// literal `original_currency` column proposal, documented in ADR/DECISIONS.md
// and TECH_DEBT.md). Never touches offers/price_history — every field here
// is computed fresh on each call, always recalculable, exactly per the
// brief's "nunca alterar o preço original" rule.
export class AutomaticCurrencyService {
  constructor(
    private readonly rateService: ExchangeRateService,
    private readonly historyService: ExchangeHistoryService
  ) {}

  async convert(input: ConvertInput): Promise<ConvertedPrice> {
    const { amountOriginal, currencyOriginal, targetCurrency, at } = input;
    const conversionDate = (at ?? new Date()).toISOString();

    if (currencyOriginal === targetCurrency) {
      return {
        originalPrice: amountOriginal,
        originalCurrency: currencyOriginal,
        targetCurrency,
        rateUsed: 1,
        convertedPrice: amountOriginal,
        conversionDate,
        rateVersion: null,
        usingFallback: false,
      };
    }

    const mapping = pairFor(currencyOriginal, targetCurrency);
    if (!mapping) {
      throw new Error(`Par de moeda não suportado: ${currencyOriginal} -> ${targetCurrency}`);
    }

    const rateRow = at
      ? await this.historyService.getRateAt(mapping.pair, at)
      : await this.rateService.getCurrentRate(mapping.pair);

    if (!rateRow) {
      throw new Error(`Nenhuma cotação disponível para ${mapping.pair}${at ? ` em ${at.toISOString()}` : ""}.`);
    }

    const effectiveRate = mapping.invert ? 1 / rateRow.rate : rateRow.rate;

    return {
      originalPrice: amountOriginal,
      originalCurrency: currencyOriginal,
      targetCurrency,
      rateUsed: effectiveRate,
      convertedPrice: amountOriginal * effectiveRate,
      conversionDate,
      rateVersion: { pair: rateRow.pair, capturedAt: rateRow.capturedAt, source: rateRow.source },
      usingFallback: isStale(rateRow),
    };
  }
}
