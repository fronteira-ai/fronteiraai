import { ExchangeRateService } from "../services/ExchangeRateService";
import { CurrencyPair } from "../enums/CurrencyPair";
import { ExchangeRateCache } from "../cache/ExchangeRateCache";
import type { ExchangeProviderRegistryImpl } from "../providers/ExchangeProviderRegistry";
import type { IExchangeRateRepository, CreateExchangeRateInput } from "../repositories/IExchangeRateRepository";
import type {
  IExchangeProviderRunRepository,
  CreateProviderRunInput,
  ProviderRun,
} from "../repositories/IExchangeProviderRunRepository";
import type { IExchangeRateProvider } from "../providers/IExchangeRateProvider";
import type { ExchangeRate, RawRateQuote } from "../types/Money";

class FakeRateRepository implements IExchangeRateRepository {
  public inserted: CreateExchangeRateInput[] = [];
  public latestByPair = new Map<CurrencyPair, ExchangeRate>();

  async insert(input: CreateExchangeRateInput): Promise<ExchangeRate | null> {
    this.inserted.push(input);
    const rate: ExchangeRate = { ...input, capturedAt: new Date().toISOString() };
    this.latestByPair.set(input.pair, rate);
    return rate;
  }

  async getLatest(pair: CurrencyPair): Promise<ExchangeRate | null> {
    return this.latestByPair.get(pair) ?? null;
  }

  async getRateAt(): Promise<ExchangeRate | null> {
    return null;
  }

  async getRange(): Promise<ExchangeRate[]> {
    return [];
  }
}

class FakeRunRepository implements IExchangeProviderRunRepository {
  public runs: CreateProviderRunInput[] = [];

  async create(input: CreateProviderRunInput): Promise<ProviderRun | null> {
    this.runs.push(input);
    return {
      id: "r1",
      providerId: input.providerId,
      status: input.status,
      responseTimeMs: input.responseTimeMs,
      errorMessage: input.errorMessage,
      attemptedAt: new Date().toISOString(),
    };
  }

  async findByProvider(): Promise<ProviderRun[]> {
    return [];
  }
}

function makeProvider(id: string, priority: number, impl: () => Promise<RawRateQuote[]>): IExchangeRateProvider {
  return { id, name: id, priority, fetchRates: jest.fn(impl) };
}

function makeRegistry(providers: IExchangeRateProvider[]): ExchangeProviderRegistryImpl {
  return {
    list: () => [...providers].sort((a, b) => a.priority - b.priority),
  } as unknown as ExchangeProviderRegistryImpl;
}

describe("ExchangeRateService.refresh", () => {
  it("persists rates from the first successful provider and triangulates BRL/PYG", async () => {
    const rateRepo = new FakeRateRepository();
    const runRepo = new FakeRunRepository();
    const provider = makeProvider("p1", 1, async () => [
      { pair: CurrencyPair.UsdPyg, rate: 8000 },
      { pair: CurrencyPair.UsdBrl, rate: 5 },
    ]);
    const service = new ExchangeRateService(makeRegistry([provider]), rateRepo, runRepo, new ExchangeRateCache());

    const result = await service.refresh();

    expect(result.usingFallback).toBe(false);
    expect(result.providerId).toBe("p1");
    expect(result.rates).toHaveLength(3); // UsdPyg, UsdBrl, + triangulated BrlPyg
    const brlPyg = result.rates.find((r) => r.pair === CurrencyPair.BrlPyg);
    expect(brlPyg?.rate).toBeCloseTo(1600, 5); // 8000 / 5
    expect(runRepo.runs[0].status).toBe("success");
  });

  it("falls back to the second provider when the first fails", async () => {
    const rateRepo = new FakeRateRepository();
    const runRepo = new FakeRunRepository();
    const failing = makeProvider("p1", 1, async () => {
      throw new Error("timeout");
    });
    const succeeding = makeProvider("p2", 2, async () => [
      { pair: CurrencyPair.UsdPyg, rate: 8100 },
      { pair: CurrencyPair.UsdBrl, rate: 5.1 },
    ]);
    const service = new ExchangeRateService(
      makeRegistry([failing, succeeding]),
      rateRepo,
      runRepo,
      new ExchangeRateCache()
    );

    const result = await service.refresh();

    expect(result.providerId).toBe("p2");
    expect(result.usingFallback).toBe(false);
    expect(runRepo.runs).toHaveLength(2);
    expect(runRepo.runs[0].status).toBe("failure");
    expect(runRepo.runs[1].status).toBe("success");
  });

  it("degrades to last-known-good when every provider fails, never fabricating a new row", async () => {
    const rateRepo = new FakeRateRepository();
    rateRepo.latestByPair.set(CurrencyPair.UsdPyg, {
      pair: CurrencyPair.UsdPyg,
      rate: 7999,
      source: "old",
      capturedAt: "2026-06-01T00:00:00Z",
    });
    const runRepo = new FakeRunRepository();
    const failing = makeProvider("p1", 1, async () => {
      throw new Error("down");
    });
    const service = new ExchangeRateService(makeRegistry([failing]), rateRepo, runRepo, new ExchangeRateCache());

    const result = await service.refresh();

    expect(result.usingFallback).toBe(true);
    expect(result.providerId).toBeNull();
    expect(rateRepo.inserted).toHaveLength(0); // never fabricates a new row
    expect(result.rates.find((r) => r.pair === CurrencyPair.UsdPyg)?.rate).toBe(7999);
  });
});

describe("ExchangeRateService.getCurrentRate", () => {
  it("returns the cached rate without hitting the repository", async () => {
    const rateRepo = new FakeRateRepository();
    const getLatestSpy = jest.spyOn(rateRepo, "getLatest");
    const cache = new ExchangeRateCache();
    cache.set({ pair: CurrencyPair.UsdPyg, rate: 8000, source: "x", capturedAt: new Date().toISOString() });

    const service = new ExchangeRateService(makeRegistry([]), rateRepo, new FakeRunRepository(), cache);
    const rate = await service.getCurrentRate(CurrencyPair.UsdPyg);

    expect(rate?.rate).toBe(8000);
    expect(getLatestSpy).not.toHaveBeenCalled();
  });

  it("falls through to the repository on a cache miss and populates the cache", async () => {
    const rateRepo = new FakeRateRepository();
    rateRepo.latestByPair.set(CurrencyPair.UsdPyg, {
      pair: CurrencyPair.UsdPyg,
      rate: 8050,
      source: "x",
      capturedAt: new Date().toISOString(),
    });
    const cache = new ExchangeRateCache();

    const service = new ExchangeRateService(makeRegistry([]), rateRepo, new FakeRunRepository(), cache);
    const rate = await service.getCurrentRate(CurrencyPair.UsdPyg);

    expect(rate?.rate).toBe(8050);
    expect(cache.get(CurrencyPair.UsdPyg)?.rate).toBe(8050);
  });
});
