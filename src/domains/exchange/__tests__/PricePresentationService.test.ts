import { PricePresentationService } from "../services/PricePresentationService";
import type { AutomaticCurrencyService } from "../services/AutomaticCurrencyService";
import { Currency } from "../enums/Currency";
import { CurrencyPair } from "../enums/CurrencyPair";
import type { ConvertedPrice } from "../types/ConvertedPrice";

function makeCurrencyService(result: ConvertedPrice | Error): AutomaticCurrencyService {
  return {
    convert: jest.fn().mockImplementation(async () => {
      if (result instanceof Error) throw result;
      return result;
    }),
  } as unknown as AutomaticCurrencyService;
}

function makeConverted(overrides: Partial<ConvertedPrice> = {}): ConvertedPrice {
  return {
    originalPrice: 100,
    originalCurrency: Currency.USD,
    targetCurrency: Currency.BRL,
    rateUsed: 5.4,
    convertedPrice: 540,
    conversionDate: new Date().toISOString(),
    rateVersion: { pair: CurrencyPair.UsdBrl, capturedAt: new Date().toISOString(), source: "exchangerate-api" },
    usingFallback: false,
    ...overrides,
  };
}

describe("PricePresentationService.present", () => {
  it("produces a full MoneyPresentation from a live conversion", async () => {
    const service = new PricePresentationService(makeCurrencyService(makeConverted()));
    const result = await service.present({ amountUSD: 100 });

    expect(result.amountUSD).toBe(100);
    expect(result.amountBRL).toBe(540);
    expect(result.provider).toBe("exchangerate-api");
    expect(result.isStale).toBe(false);
    expect(result.formattedUSD).toMatch(/\$100/);
    expect(result.formattedBRL).toMatch(/R\$/);
    expect(result.formattedRate).toMatch(/1 USD = R\$ 5,40/);
    expect(result.formattedTimestamp).not.toBe("Cotação desatualizada");
  });

  it("never hides staleness — isStale and the formatted timestamp both reflect usingFallback", async () => {
    const service = new PricePresentationService(makeCurrencyService(makeConverted({ usingFallback: true })));
    const result = await service.present({ amountUSD: 100 });

    expect(result.isStale).toBe(true);
    expect(result.formattedTimestamp).toBe("Cotação desatualizada");
  });

  it("never fabricates a BRL amount when no rate exists at all — amountBRL is null, not estimated", async () => {
    const service = new PricePresentationService(makeCurrencyService(new Error("Nenhuma cotação disponível")));
    const result = await service.present({ amountUSD: 100 });

    expect(result.amountBRL).toBeNull();
    expect(result.formattedBRL).toBeNull();
    expect(result.isStale).toBe(true);
    expect(result.formattedUSD).toMatch(/\$100/);
  });

  it("respects a known, independently-sourced BRL amount (ADR-009) — formats it, never converts or overwrites it", async () => {
    const convertMock = jest.fn();
    const service = new PricePresentationService({ convert: convertMock } as unknown as AutomaticCurrencyService);

    const result = await service.present({ amountUSD: 100, knownAmountBRL: 610 });

    expect(convertMock).not.toHaveBeenCalled();
    expect(result.amountBRL).toBe(610);
    expect(result.formattedBRL).toMatch(/R\$/);
    expect(result.provider).toBeNull();
    expect(result.formattedTimestamp).toBe("Preço informado pela loja");
  });
});

describe("PricePresentationService.presentSavings", () => {
  it("formats savings in both currencies plus percent", async () => {
    const service = new PricePresentationService(makeCurrencyService(makeConverted({ convertedPrice: 162 })));
    const result = await service.presentSavings({ amountUSD: 30, percent: 25 });

    expect(result.amountUSD).toBe(30);
    expect(result.amountBRL).toBe(162);
    expect(result.formattedPercent).toBe("25%");
  });
});

describe("PricePresentationService.formatAmount", () => {
  it("formats USD and BRL without any conversion", () => {
    const service = new PricePresentationService({} as AutomaticCurrencyService);
    expect(service.formatAmount(100, Currency.USD)).toMatch(/\$100/);
    expect(service.formatAmount(100, Currency.BRL)).toMatch(/R\$/);
  });
});
