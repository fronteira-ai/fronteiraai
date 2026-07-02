import { computePriceAggregation, CanonicalPriceHistoryService } from "../services/CanonicalPriceHistoryService";
import type { CanonicalPriceHistoryPoint, ICanonicalPriceHistoryRepository } from "../repositories/ICanonicalPriceHistoryRepository";

function point(overrides: Partial<CanonicalPriceHistoryPoint> = {}): CanonicalPriceHistoryPoint {
  return { offerId: "offer-1", priceUSD: 100, recordedAt: "2026-06-01T00:00:00Z", ...overrides };
}

describe("computePriceAggregation", () => {
  it("returns an 'unknown' aggregation when there is no data at all", () => {
    const result = computePriceAggregation([], []);
    expect(result).toEqual({
      lowestPriceUSD: null,
      highestPriceUSD: null,
      averagePriceUSD: null,
      variationPercent: null,
      trend: "unknown",
      lastUpdatedAt: null,
    });
  });

  it("computes lowest/highest/average across historical and current prices combined", () => {
    const history = [point({ priceUSD: 100, recordedAt: "2026-06-01T00:00:00Z" }), point({ priceUSD: 90, recordedAt: "2026-06-15T00:00:00Z" })];
    const result = computePriceAggregation(history, [80]);

    expect(result.lowestPriceUSD).toBe(80);
    expect(result.highestPriceUSD).toBe(100);
    expect(result.averagePriceUSD).toBeCloseTo((100 + 90 + 80) / 3);
  });

  it("classifies a real price drop as 'down'", () => {
    const history = [point({ priceUSD: 100, recordedAt: "2026-06-01T00:00:00Z" }), point({ priceUSD: 50, recordedAt: "2026-06-15T00:00:00Z" })];
    const result = computePriceAggregation(history, []);

    expect(result.variationPercent).toBeCloseTo(-50);
    expect(result.trend).toBe("down");
  });

  it("classifies a real price rise as 'up'", () => {
    const history = [point({ priceUSD: 100, recordedAt: "2026-06-01T00:00:00Z" }), point({ priceUSD: 150, recordedAt: "2026-06-15T00:00:00Z" })];
    const result = computePriceAggregation(history, []);

    expect(result.variationPercent).toBeCloseTo(50);
    expect(result.trend).toBe("up");
  });

  it("classifies a small fluctuation within tolerance as 'stable'", () => {
    const history = [point({ priceUSD: 100, recordedAt: "2026-06-01T00:00:00Z" }), point({ priceUSD: 101, recordedAt: "2026-06-15T00:00:00Z" })];
    const result = computePriceAggregation(history, []);
    expect(result.trend).toBe("stable");
  });

  it("prefers the latest live offer price over stale history for the trend's end point", () => {
    const history = [point({ priceUSD: 100, recordedAt: "2026-06-01T00:00:00Z" })];
    const result = computePriceAggregation(history, [40]);
    expect(result.variationPercent).toBeCloseTo(-60);
    expect(result.trend).toBe("down");
  });
});

describe("CanonicalPriceHistoryService", () => {
  it("fetches history from the repository and aggregates it with current offer prices", async () => {
    const findByCanonicalProductId = jest
      .fn()
      .mockResolvedValue([point({ priceUSD: 100, recordedAt: "2026-06-01T00:00:00Z" })]);
    const repo: ICanonicalPriceHistoryRepository = { findByCanonicalProductId };
    const service = new CanonicalPriceHistoryService(repo);

    const result = await service.getAggregatedPriceHistory("canonical-1", [80]);

    expect(findByCanonicalProductId).toHaveBeenCalledWith("canonical-1");
    expect(result.lowestPriceUSD).toBe(80);
  });
});
