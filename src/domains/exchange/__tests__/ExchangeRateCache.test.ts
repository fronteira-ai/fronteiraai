import { ExchangeRateCache } from "../cache/ExchangeRateCache";
import { CurrencyPair } from "../enums/CurrencyPair";
import type { ExchangeRate } from "../types/Money";

function makeRate(overrides: Partial<ExchangeRate> = {}): ExchangeRate {
  return {
    pair: CurrencyPair.UsdPyg,
    rate: 8000,
    source: "exchangerate-api",
    capturedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("ExchangeRateCache", () => {
  it("returns null for a pair that was never set", () => {
    const cache = new ExchangeRateCache();
    expect(cache.get(CurrencyPair.UsdPyg)).toBeNull();
  });

  it("returns the cached rate before expiry", () => {
    const cache = new ExchangeRateCache();
    const rate = makeRate();
    cache.set(rate);
    expect(cache.get(CurrencyPair.UsdPyg)).toEqual(rate);
  });

  it("expires an entry after the TTL elapses", () => {
    jest.useFakeTimers();
    const cache = new ExchangeRateCache();
    cache.set(makeRate());

    jest.advanceTimersByTime(61_000); // TTL is 60_000ms

    expect(cache.get(CurrencyPair.UsdPyg)).toBeNull();
    jest.useRealTimers();
  });

  it("keeps separate entries per pair", () => {
    const cache = new ExchangeRateCache();
    cache.set(makeRate({ pair: CurrencyPair.UsdPyg, rate: 8000 }));
    cache.set(makeRate({ pair: CurrencyPair.UsdBrl, rate: 5.4 }));

    expect(cache.get(CurrencyPair.UsdPyg)?.rate).toBe(8000);
    expect(cache.get(CurrencyPair.UsdBrl)?.rate).toBe(5.4);
  });

  it("clear() removes every entry", () => {
    const cache = new ExchangeRateCache();
    cache.set(makeRate());
    cache.clear();
    expect(cache.get(CurrencyPair.UsdPyg)).toBeNull();
  });
});
