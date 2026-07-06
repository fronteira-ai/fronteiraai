import { AutomaticCurrencyService } from "../services/AutomaticCurrencyService";
import { Currency } from "../enums/Currency";
import { CurrencyPair } from "../enums/CurrencyPair";
import type { ExchangeRateService } from "../services/ExchangeRateService";
import type { ExchangeHistoryService } from "../history/ExchangeHistoryService";
import type { ExchangeRate } from "../types/Money";

function makeRateService(rate: ExchangeRate | null): ExchangeRateService {
  return { getCurrentRate: jest.fn().mockResolvedValue(rate) } as unknown as ExchangeRateService;
}

function makeHistoryService(rate: ExchangeRate | null): ExchangeHistoryService {
  return { getRateAt: jest.fn().mockResolvedValue(rate) } as unknown as ExchangeHistoryService;
}

describe("AutomaticCurrencyService.convert", () => {
  it("returns a 1:1 shortcut for same-currency conversion, no rate row involved", async () => {
    const service = new AutomaticCurrencyService(makeRateService(null), makeHistoryService(null));
    const result = await service.convert({
      amountOriginal: 100,
      currencyOriginal: Currency.USD,
      targetCurrency: Currency.USD,
    });

    expect(result.rateUsed).toBe(1);
    expect(result.convertedPrice).toBe(100);
    expect(result.rateVersion).toBeNull();
    expect(result.usingFallback).toBe(false);
  });

  it("converts USD to PYG using the current rate", async () => {
    const rate: ExchangeRate = {
      pair: CurrencyPair.UsdPyg,
      rate: 8000,
      source: "x",
      capturedAt: new Date().toISOString(),
    };
    const service = new AutomaticCurrencyService(makeRateService(rate), makeHistoryService(null));

    const result = await service.convert({
      amountOriginal: 10,
      currencyOriginal: Currency.USD,
      targetCurrency: Currency.PYG,
    });

    expect(result.convertedPrice).toBe(80000);
    expect(result.rateUsed).toBe(8000);
    expect(result.rateVersion?.pair).toBe(CurrencyPair.UsdPyg);
  });

  it("inverts the rate when converting PYG back to USD", async () => {
    const rate: ExchangeRate = {
      pair: CurrencyPair.UsdPyg,
      rate: 8000,
      source: "x",
      capturedAt: new Date().toISOString(),
    };
    const service = new AutomaticCurrencyService(makeRateService(rate), makeHistoryService(null));

    const result = await service.convert({
      amountOriginal: 8000,
      currencyOriginal: Currency.PYG,
      targetCurrency: Currency.USD,
    });

    expect(result.convertedPrice).toBeCloseTo(1, 5);
    expect(result.rateUsed).toBeCloseTo(1 / 8000, 10);
  });

  it("uses ExchangeHistoryService.getRateAt when `at` is provided, not the current rate", async () => {
    const historicalRate: ExchangeRate = {
      pair: CurrencyPair.UsdBrl,
      rate: 5.2,
      source: "x",
      capturedAt: "2026-06-01T00:00:00Z",
    };
    const getCurrentRateMock = jest.fn().mockResolvedValue(null);
    const rateService = { getCurrentRate: getCurrentRateMock } as unknown as ExchangeRateService;
    const historyService = makeHistoryService(historicalRate);
    const service = new AutomaticCurrencyService(rateService, historyService);

    const result = await service.convert({
      amountOriginal: 100,
      currencyOriginal: Currency.USD,
      targetCurrency: Currency.BRL,
      at: new Date("2026-06-01T00:00:00Z"),
    });

    expect(result.rateUsed).toBe(5.2);
    expect(getCurrentRateMock).not.toHaveBeenCalled();
  });

  it("throws when no rate is available for the requested pair", async () => {
    const service = new AutomaticCurrencyService(makeRateService(null), makeHistoryService(null));
    await expect(
      service.convert({ amountOriginal: 100, currencyOriginal: Currency.USD, targetCurrency: Currency.BRL })
    ).rejects.toThrow(/Nenhuma cotação disponível/);
  });

  it("flags usingFallback when the rate is older than the staleness threshold", async () => {
    const staleRate: ExchangeRate = {
      pair: CurrencyPair.UsdPyg,
      rate: 8000,
      source: "x",
      capturedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 min old, threshold is 15
    };
    const service = new AutomaticCurrencyService(makeRateService(staleRate), makeHistoryService(null));

    const result = await service.convert({
      amountOriginal: 10,
      currencyOriginal: Currency.USD,
      targetCurrency: Currency.PYG,
    });
    expect(result.usingFallback).toBe(true);
  });

  it("does not flag usingFallback for a fresh rate", async () => {
    const freshRate: ExchangeRate = {
      pair: CurrencyPair.UsdPyg,
      rate: 8000,
      source: "x",
      capturedAt: new Date().toISOString(),
    };
    const service = new AutomaticCurrencyService(makeRateService(freshRate), makeHistoryService(null));

    const result = await service.convert({
      amountOriginal: 10,
      currencyOriginal: Currency.USD,
      targetCurrency: Currency.PYG,
    });
    expect(result.usingFallback).toBe(false);
  });
});
