import { Currency } from "../enums/Currency";
import type { AutomaticCurrencyService } from "./AutomaticCurrencyService";
import type {
  MoneyPresentation,
  MoneySavingsPresentation,
  PresentMoneyInput,
  PresentSavingsInput,
} from "../types/MoneyPresentation";
import { formatUSD, formatBRL, formatRate, formatTimestamp } from "../presentation/formatters";

// Program ΔR — Mission ΔR-1.2 (Universal Price Presentation). The ONLY
// class allowed to produce a MoneyPresentation — every screen consumes its
// output, none construct one themselves (CTO decision: no formatPrice(),
// no USD*rate math, no Intl.NumberFormat, no manual conversion outside this
// service). Composition only: reads AutomaticCurrencyService (already
// existing since Release 1.8), introduces no new conversion math.
//
// ADR-009 boundary (Objetivo 3 audit finding): `offers.price_brl` is an
// independent, merchant-entered value, never derived from the exchange
// rate. `PresentMoneyInput.knownAmountBRL` lets a caller pass that real
// value through — this service formats it, it never overwrites it with a
// computed estimate.
const KNOWN_AMOUNT_TIMESTAMP_LABEL = "Preço informado pela loja";

export class PricePresentationService {
  constructor(private readonly currencyService: AutomaticCurrencyService) {}

  async present(input: PresentMoneyInput): Promise<MoneyPresentation> {
    const presentedAt = new Date().toISOString();
    const formattedUSD = formatUSD(input.amountUSD);

    if (input.knownAmountBRL !== undefined) {
      return {
        amountUSD: input.amountUSD,
        amountBRL: input.knownAmountBRL,
        currencyPair: null,
        exchangeRate: null,
        provider: null,
        capturedAt: null,
        presentedAt,
        isStale: false,
        formattedUSD,
        formattedBRL: formatBRL(input.knownAmountBRL),
        formattedRate: null,
        formattedTimestamp: KNOWN_AMOUNT_TIMESTAMP_LABEL,
      };
    }

    try {
      const converted = await this.currencyService.convert({
        amountOriginal: input.amountUSD,
        currencyOriginal: Currency.USD,
        targetCurrency: input.targetCurrency ?? Currency.BRL,
        at: input.at,
      });

      return {
        amountUSD: input.amountUSD,
        amountBRL: converted.convertedPrice,
        currencyPair: converted.rateVersion?.pair ?? null,
        exchangeRate: converted.rateUsed,
        provider: converted.rateVersion?.source ?? null,
        capturedAt: converted.rateVersion?.capturedAt ?? null,
        presentedAt,
        isStale: converted.usingFallback,
        formattedUSD,
        formattedBRL: formatBRL(converted.convertedPrice),
        formattedRate: formatRate(converted.rateUsed, "R$"),
        formattedTimestamp: formatTimestamp(converted.rateVersion?.capturedAt ?? null, converted.usingFallback),
      };
    } catch {
      // AutomaticCurrencyService throws when there is no exchange_rates row
      // at all for the pair (e.g. the system has never completed a real
      // refresh — Mission ΔR-1.1's documented current state). Never fabricate
      // a rate here — an absent BRL figure is the honest answer.
      return {
        amountUSD: input.amountUSD,
        amountBRL: null,
        currencyPair: null,
        exchangeRate: null,
        provider: null,
        capturedAt: null,
        presentedAt,
        isStale: true,
        formattedUSD,
        formattedBRL: null,
        formattedRate: null,
        formattedTimestamp: formatTimestamp(null, true),
      };
    }
  }

  async presentSavings(input: PresentSavingsInput): Promise<MoneySavingsPresentation> {
    const money = await this.present({ amountUSD: input.amountUSD, knownAmountBRL: input.knownAmountBRL });
    return {
      amountUSD: input.amountUSD,
      amountBRL: money.amountBRL,
      percent: input.percent,
      formattedUSD: money.formattedUSD,
      formattedBRL: money.formattedBRL,
      formattedPercent: `${input.percent.toFixed(0)}%`,
    };
  }

  /** Pure formatting, no conversion — for a value already known in its
   * display currency (e.g. offers.price_brl itself, or a USD figure with
   * no BRL counterpart requested). Never used to convert between currencies. */
  formatAmount(value: number, currency: Currency): string {
    return currency === Currency.BRL ? formatBRL(value) : formatUSD(value);
  }
}
