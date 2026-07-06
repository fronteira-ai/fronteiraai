import { ExchangeRateApiProvider } from "../providers/ExchangeRateApiProvider";
import { CurrencyPair } from "../enums/CurrencyPair";
import * as httpClient from "../infrastructure/ExchangeRateApiHttpClient";

jest.mock("../infrastructure/ExchangeRateApiHttpClient");
const fetchJsonMock = httpClient.fetchJson as jest.Mock;

const ORIGINAL_ENV = process.env.EXCHANGE_RATE_API_KEY;

describe("ExchangeRateApiProvider", () => {
  beforeEach(() => {
    process.env.EXCHANGE_RATE_API_KEY = "test-key";
    fetchJsonMock.mockReset();
  });

  afterAll(() => {
    process.env.EXCHANGE_RATE_API_KEY = ORIGINAL_ENV;
  });

  it("throws when the API key is not configured", async () => {
    delete process.env.EXCHANGE_RATE_API_KEY;
    const provider = new ExchangeRateApiProvider();
    await expect(provider.fetchRates()).rejects.toThrow(/EXCHANGE_RATE_API_KEY/);
  });

  it("returns USD/PYG and USD/BRL quotes on a successful response", async () => {
    fetchJsonMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { result: "success", base_code: "USD", conversion_rates: { PYG: 8000, BRL: 5.4 } },
    });

    const provider = new ExchangeRateApiProvider();
    const quotes = await provider.fetchRates();

    expect(quotes).toEqual([
      { pair: CurrencyPair.UsdPyg, rate: 8000 },
      { pair: CurrencyPair.UsdBrl, rate: 5.4 },
    ]);
  });

  it("throws when the HTTP call itself fails", async () => {
    fetchJsonMock.mockResolvedValue({ ok: false, status: 503, data: null, error: "HTTP 503" });
    const provider = new ExchangeRateApiProvider();
    await expect(provider.fetchRates()).rejects.toThrow(/ExchangeRate-API\.com falhou/);
  });

  it("throws when the API reports a non-success result", async () => {
    fetchJsonMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { result: "error", base_code: "USD", conversion_rates: {} },
    });
    const provider = new ExchangeRateApiProvider();
    await expect(provider.fetchRates()).rejects.toThrow(/resultado inesperado/);
  });

  it("throws when PYG/BRL are missing from the response (malformed)", async () => {
    fetchJsonMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { result: "success", base_code: "USD", conversion_rates: { EUR: 0.9 } },
    });
    const provider = new ExchangeRateApiProvider();
    await expect(provider.fetchRates()).rejects.toThrow(/malformada/);
  });
});
