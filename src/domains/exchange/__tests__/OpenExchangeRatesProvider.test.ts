import { OpenExchangeRatesProvider } from "../providers/OpenExchangeRatesProvider";
import { CurrencyPair } from "../enums/CurrencyPair";
import * as httpClient from "../infrastructure/ExchangeRateApiHttpClient";

jest.mock("../infrastructure/ExchangeRateApiHttpClient");
const fetchJsonMock = httpClient.fetchJson as jest.Mock;

const ORIGINAL_ENV = process.env.OPEN_EXCHANGE_RATES_APP_ID;

describe("OpenExchangeRatesProvider", () => {
  beforeEach(() => {
    process.env.OPEN_EXCHANGE_RATES_APP_ID = "test-app-id";
    fetchJsonMock.mockReset();
  });

  afterAll(() => {
    process.env.OPEN_EXCHANGE_RATES_APP_ID = ORIGINAL_ENV;
  });

  it("has priority 2 — only reached when the primary provider fails", () => {
    expect(new OpenExchangeRatesProvider().priority).toBe(2);
  });

  it("throws when the app id is not configured", async () => {
    delete process.env.OPEN_EXCHANGE_RATES_APP_ID;
    const provider = new OpenExchangeRatesProvider();
    await expect(provider.fetchRates()).rejects.toThrow(/OPEN_EXCHANGE_RATES_APP_ID/);
  });

  it("returns USD/PYG and USD/BRL quotes on a successful response", async () => {
    fetchJsonMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { base: "USD", rates: { PYG: 7950, BRL: 5.35, EUR: 0.92 } },
    });

    const provider = new OpenExchangeRatesProvider();
    const quotes = await provider.fetchRates();

    expect(quotes).toEqual([
      { pair: CurrencyPair.UsdPyg, rate: 7950 },
      { pair: CurrencyPair.UsdBrl, rate: 5.35 },
    ]);
  });

  it("throws when the HTTP call itself fails", async () => {
    fetchJsonMock.mockResolvedValue({ ok: false, status: 503, data: null, error: "HTTP 503" });
    const provider = new OpenExchangeRatesProvider();
    await expect(provider.fetchRates()).rejects.toThrow(/Open Exchange Rates falhou/);
  });

  it("throws when PYG/BRL are missing from the response (malformed)", async () => {
    fetchJsonMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { base: "USD", rates: { EUR: 0.9 } },
    });
    const provider = new OpenExchangeRatesProvider();
    await expect(provider.fetchRates()).rejects.toThrow(/malformada/);
  });
});
