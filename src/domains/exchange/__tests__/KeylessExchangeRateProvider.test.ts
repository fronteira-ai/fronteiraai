import { KeylessExchangeRateProvider } from "../providers/KeylessExchangeRateProvider";
import {
  isWithinSanityBounds,
  relativeDivergence,
  MAX_CROSS_DIVERGENCE,
} from "../providers/KeylessExchangeRateProvider";
import { CurrencyPair } from "../enums/CurrencyPair";
import { fetchJson } from "../infrastructure/ExchangeRateApiHttpClient";

// Mission 05.19 — o provider sem chave é o único caminho de câmbio até existir
// credencial, então o comportamento dele PRECISA de teste: ele é a barreira que
// impede uma resposta ruim (portal cativo, HTML, taxa fora da realidade) de virar
// conversão publicada. Nenhum teste faz rede: `fetchJson` é mockado.

jest.mock("../infrastructure/ExchangeRateApiHttpClient", () => ({
  fetchJson: jest.fn(),
}));

const mocked = fetchJson as jest.MockedFunction<typeof fetchJson>;

const ok = (data: unknown) => ({ ok: true, status: 200, data }) as never;
const fail = () => ({ ok: false, status: 503, data: null, error: "HTTP 503" }) as never;

const OPEN_ER_OK = {
  result: "success",
  base_code: "USD",
  time_last_update_utc: "Tue, 14 Oct 2026 00:02:31 +0000",
  rates: { PYG: 5710.951674, BRL: 5.015062 },
};

// Valores reais medidos em 14/10/2026 (currency-api pela jsDelivr e pelo espelho
// Cloudflare devolvem exatamente os mesmos números).
const CURRENCY_API_OK = { date: "2026-10-14", usd: { pyg: 5715.14457105, brl: 5.02743305 } };

describe("KeylessExchangeRateProvider (Mission 05.19)", () => {
  let provider: KeylessExchangeRateProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new KeylessExchangeRateProvider();
  });

  it("não exige nenhuma variável de ambiente (sem chave) e fica atrás dos providers com chave", () => {
    expect(process.env.EXCHANGE_RATE_API_KEY).toBeUndefined();
    expect(provider.priority).toBe(3);
    expect(provider.id).toBe("keyless-open-er-api");
  });

  it("devolve USD→PYG e USD→BRL quando as duas fontes concordam", async () => {
    mocked.mockImplementation(async (url: string) =>
      String(url).includes("open.er-api") ? ok(OPEN_ER_OK) : ok(CURRENCY_API_OK)
    );

    const quotes = await provider.fetchRates();

    expect(quotes).toHaveLength(2);
    expect(quotes.find((q) => q.pair === CurrencyPair.UsdPyg)?.rate).toBeCloseTo(5710.951674, 6);
    expect(quotes.find((q) => q.pair === CurrencyPair.UsdBrl)?.rate).toBeCloseTo(5.015062, 6);
  });

  it("usa a segunda fonte quando a primeira está indisponível", async () => {
    mocked.mockImplementation(async (url: string) =>
      String(url).includes("open.er-api") ? fail() : ok(CURRENCY_API_OK)
    );

    const quotes = await provider.fetchRates();

    expect(quotes.find((q) => q.pair === CurrencyPair.UsdPyg)?.rate).toBeCloseTo(5715.14457105, 6);
    expect(quotes.find((q) => q.pair === CurrencyPair.UsdBrl)?.rate).toBeCloseTo(5.02743305, 6);
  });

  it("cai para o espelho Cloudflare quando o CDN primário falha", async () => {
    mocked.mockImplementation(async (url: string) => {
      if (String(url).includes("open.er-api")) return fail();
      if (String(url).includes("jsdelivr")) return fail();
      return ok(CURRENCY_API_OK);
    });

    const quotes = await provider.fetchRates();
    expect(quotes.find((q) => q.pair === CurrencyPair.UsdPyg)?.rate).toBeCloseTo(5715.14457105, 6);
  });

  it("NÃO publica quando as duas fontes falham (falha fechada)", async () => {
    mocked.mockResolvedValue(fail());
    await expect(provider.fetchRates()).rejects.toThrow(/Nenhuma fonte sem chave/);
  });

  it("descarta taxa fora da faixa de sanidade (resposta corrompida)", async () => {
    // PYG = 57,1: erro de escala de 100x — típico de resposta truncada/HTML parseado
    mocked.mockImplementation(async (url: string) =>
      String(url).includes("open.er-api")
        ? ok({ result: "success", rates: { PYG: 57.1, BRL: 5.01 } })
        : ok({ date: "2026-10-14", usd: { pyg: 57.1, brl: 5.02 } })
    );

    await expect(provider.fetchRates()).rejects.toThrow(/Nenhuma fonte sem chave/);
  });

  it("NÃO publica quando as fontes divergem acima do limite", async () => {
    mocked.mockImplementation(async (url: string) =>
      String(url).includes("open.er-api")
        ? ok({ result: "success", rates: { PYG: 5710.95, BRL: 5.015 } })
        : ok({ date: "2026-10-14", usd: { pyg: 7000.0, brl: 5.02 } }) // +22%
    );

    await expect(provider.fetchRates()).rejects.toThrow(/divergem acima do tolerado/);
  });

  it("aceita a divergência real medida entre as duas fontes (0,073% PYG / 0,246% BRL)", async () => {
    mocked.mockImplementation(async (url: string) =>
      String(url).includes("open.er-api") ? ok(OPEN_ER_OK) : ok(CURRENCY_API_OK)
    );

    const quotes = await provider.fetchRates();
    const pyg = quotes.find((q) => q.pair === CurrencyPair.UsdPyg)?.rate ?? 0;
    expect(relativeDivergence(5710.951674, pyg)).toBeLessThan(MAX_CROSS_DIVERGENCE);
  });

  it("rejeita resposta malformada (sem PYG/BRL) em vez de adivinhar", async () => {
    mocked.mockResolvedValue(ok({ result: "success", rates: { EUR: 0.92 } }));
    await expect(provider.fetchRates()).rejects.toThrow(/Nenhuma fonte sem chave/);
  });

  it("helpers puros: faixa de sanidade e divergência relativa", () => {
    expect(isWithinSanityBounds(5710.95, 5.015)).toBe(true);
    expect(isWithinSanityBounds(57.1, 5.015)).toBe(false);
    expect(isWithinSanityBounds(5710.95, 0.5)).toBe(false);
    expect(isWithinSanityBounds(Number.NaN, 5)).toBe(false);
    expect(relativeDivergence(100, 101)).toBeCloseTo(1 / 101, 6);
    expect(relativeDivergence(100, 0)).toBe(Infinity);
  });
});
