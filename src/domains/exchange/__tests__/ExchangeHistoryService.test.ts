import { ExchangeHistoryService } from "../history/ExchangeHistoryService";
import { CurrencyPair } from "../enums/CurrencyPair";
import type { IExchangeRateRepository, CreateExchangeRateInput } from "../repositories/IExchangeRateRepository";
import type { ExchangeRate } from "../types/Money";

class FakeRateRepository implements IExchangeRateRepository {
  public rates: ExchangeRate[] = [];

  async insert(input: CreateExchangeRateInput): Promise<ExchangeRate | null> {
    const rate: ExchangeRate = { ...input, capturedAt: new Date().toISOString() };
    this.rates.push(rate);
    return rate;
  }

  async getLatest(pair: CurrencyPair): Promise<ExchangeRate | null> {
    const matching = this.rates.filter((r) => r.pair === pair).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
    return matching[0] ?? null;
  }

  async getRateAt(pair: CurrencyPair, at: Date): Promise<ExchangeRate | null> {
    const matching = this.rates
      .filter((r) => r.pair === pair && r.capturedAt <= at.toISOString())
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
    return matching[0] ?? null;
  }

  async getRange(pair: CurrencyPair, from: Date, to: Date): Promise<ExchangeRate[]> {
    return this.rates
      .filter((r) => r.pair === pair && r.capturedAt >= from.toISOString() && r.capturedAt <= to.toISOString())
      .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  }
}

describe("ExchangeHistoryService", () => {
  it("getLatest delegates to the repository", async () => {
    const repo = new FakeRateRepository();
    repo.rates = [{ pair: CurrencyPair.UsdPyg, rate: 8000, source: "x", capturedAt: "2026-07-01T00:00:00Z" }];
    const service = new ExchangeHistoryService(repo);

    expect((await service.getLatest(CurrencyPair.UsdPyg))?.rate).toBe(8000);
  });

  it("getRateAt returns the rate in effect at or before a historical moment, not the latest", async () => {
    const repo = new FakeRateRepository();
    repo.rates = [
      { pair: CurrencyPair.UsdPyg, rate: 7900, source: "x", capturedAt: "2026-06-30T00:00:00Z" },
      { pair: CurrencyPair.UsdPyg, rate: 8000, source: "x", capturedAt: "2026-07-01T00:00:00Z" },
      { pair: CurrencyPair.UsdPyg, rate: 8100, source: "x", capturedAt: "2026-07-02T00:00:00Z" },
    ];
    const service = new ExchangeHistoryService(repo);

    const rate = await service.getRateAt(CurrencyPair.UsdPyg, new Date("2026-07-01T12:00:00Z"));
    expect(rate?.rate).toBe(8000);
  });

  it("getRateAt returns null when no rate existed yet at that moment", async () => {
    const repo = new FakeRateRepository();
    repo.rates = [{ pair: CurrencyPair.UsdPyg, rate: 8000, source: "x", capturedAt: "2026-07-01T00:00:00Z" }];
    const service = new ExchangeHistoryService(repo);

    const rate = await service.getRateAt(CurrencyPair.UsdPyg, new Date("2026-06-01T00:00:00Z"));
    expect(rate).toBeNull();
  });

  it("getRange returns only rates within [from, to], ascending", async () => {
    // Fixtures use full millisecond-precision ISO strings (".000Z") to match
    // exactly what `Date.toISOString()` produces for `from`/`to` below — the
    // fake repo compares raw strings, and "...:00Z" sorts lexicographically
    // AFTER "...:00.000Z" (since 'Z' > '.'), which would otherwise make an
    // exact-boundary timestamp look like it's outside its own range. Real
    // Postgres timestamptz comparison doesn't have this artifact.
    const repo = new FakeRateRepository();
    repo.rates = [
      { pair: CurrencyPair.UsdPyg, rate: 8100, source: "x", capturedAt: "2026-07-03T00:00:00.000Z" },
      { pair: CurrencyPair.UsdPyg, rate: 8000, source: "x", capturedAt: "2026-07-01T00:00:00.000Z" },
      { pair: CurrencyPair.UsdPyg, rate: 7900, source: "x", capturedAt: "2026-06-01T00:00:00.000Z" }, // outside range
    ];
    const service = new ExchangeHistoryService(repo);

    const range = await service.getRange(
      CurrencyPair.UsdPyg,
      new Date("2026-07-01T00:00:00Z"),
      new Date("2026-07-03T00:00:00Z")
    );
    expect(range.map((r) => r.rate)).toEqual([8000, 8100]);
  });
});
