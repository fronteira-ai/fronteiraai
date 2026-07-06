import {
  computeRateVariation,
  detectSignificantMoves,
  computeStoreReactionLag,
  computeCategoryImpact,
  computeCatalogValueGrowth,
  computeBuyerSavings,
} from "../analytics/formulas";

describe("computeRateVariation", () => {
  it("returns null for an empty array", () => {
    expect(computeRateVariation([])).toBeNull();
  });

  it("computes variation percent between first and last rate, sorted by time", () => {
    const result = computeRateVariation([
      { rate: 8000, capturedAt: "2026-07-01T00:00:00Z" },
      { rate: 8400, capturedAt: "2026-07-02T00:00:00Z" },
    ]);
    expect(result?.variationPercent).toBeCloseTo(5, 5);
    expect(result?.startRate).toBe(8000);
    expect(result?.endRate).toBe(8400);
  });

  it("sorts out-of-order input before computing start/end", () => {
    const result = computeRateVariation([
      { rate: 8400, capturedAt: "2026-07-02T00:00:00Z" },
      { rate: 8000, capturedAt: "2026-07-01T00:00:00Z" },
    ]);
    expect(result?.startRate).toBe(8000);
    expect(result?.endRate).toBe(8400);
  });

  it("reports min/max across the range", () => {
    const result = computeRateVariation([
      { rate: 8000, capturedAt: "2026-07-01T00:00:00Z" },
      { rate: 7800, capturedAt: "2026-07-01T12:00:00Z" },
      { rate: 8400, capturedAt: "2026-07-02T00:00:00Z" },
    ]);
    expect(result?.minRate).toBe(7800);
    expect(result?.maxRate).toBe(8400);
  });
});

describe("detectSignificantMoves", () => {
  it("flags consecutive deltas at or above the threshold", () => {
    const moves = detectSignificantMoves(
      [
        { rate: 8000, capturedAt: "2026-07-01T00:00:00Z" },
        { rate: 8100, capturedAt: "2026-07-01T01:00:00Z" }, // +1.25%
        { rate: 8100, capturedAt: "2026-07-01T02:00:00Z" }, // 0%
      ],
      1
    );
    expect(moves).toHaveLength(1);
    expect(moves[0].deltaPercent).toBeCloseTo(1.25, 2);
  });

  it("ignores moves below the threshold", () => {
    const moves = detectSignificantMoves(
      [
        { rate: 8000, capturedAt: "2026-07-01T00:00:00Z" },
        { rate: 8010, capturedAt: "2026-07-01T01:00:00Z" }, // 0.125%
      ],
      1
    );
    expect(moves).toHaveLength(0);
  });

  it("flags a significant downward move too (absolute value)", () => {
    const moves = detectSignificantMoves(
      [
        { rate: 8000, capturedAt: "2026-07-01T00:00:00Z" },
        { rate: 7900, capturedAt: "2026-07-01T01:00:00Z" }, // -1.25%
      ],
      1
    );
    expect(moves).toHaveLength(1);
    expect(moves[0].deltaPercent).toBeLessThan(0);
  });
});

describe("computeStoreReactionLag", () => {
  const moves = [{ capturedAt: "2026-07-01T00:00:00Z", fromRate: 8000, toRate: 8100, deltaPercent: 1.25 }];

  it("computes average lag in hours to the next price_history entry after a move", () => {
    const byStore = new Map([["s1", [{ recordedAt: "2026-07-01T02:00:00Z" }]]]);
    const result = computeStoreReactionLag(moves, byStore);
    expect(result[0].averageLagHours).toBeCloseTo(2, 5);
    expect(result[0].movesObserved).toBe(1);
  });

  it("reports null lag when no price_history entry follows any move", () => {
    const byStore = new Map([["s1", [{ recordedAt: "2026-06-30T00:00:00Z" }]]]); // before the move
    const result = computeStoreReactionLag(moves, byStore);
    expect(result[0].averageLagHours).toBeNull();
    expect(result[0].movesObserved).toBe(0);
  });

  it("sorts stores by average lag ascending (fastest reaction first)", () => {
    const byStore = new Map([
      ["slow", [{ recordedAt: "2026-07-01T10:00:00Z" }]],
      ["fast", [{ recordedAt: "2026-07-01T01:00:00Z" }]],
    ]);
    const result = computeStoreReactionLag(moves, byStore);
    expect(result[0].storeId).toBe("fast");
  });
});

describe("computeCategoryImpact", () => {
  const moves = [{ capturedAt: "2026-07-01T00:00:00Z", fromRate: 8000, toRate: 8100, deltaPercent: 1.25 }];

  it("averages absolute percent price change within the window following a move", () => {
    const byCategory = new Map([
      ["cat1", [{ priceUsd: 110, previousPriceUsd: 100, recordedAt: "2026-07-01T01:00:00Z" }]],
    ]);
    const result = computeCategoryImpact(moves, byCategory, 24);
    expect(result[0].averageAbsPriceChangePercent).toBeCloseTo(10, 5);
    expect(result[0].changesObserved).toBe(1);
  });

  it("excludes price changes outside the window", () => {
    const byCategory = new Map([
      ["cat1", [{ priceUsd: 110, previousPriceUsd: 100, recordedAt: "2026-07-05T00:00:00Z" }]], // far outside 24h window
    ]);
    const result = computeCategoryImpact(moves, byCategory, 24);
    expect(result[0].averageAbsPriceChangePercent).toBeNull();
  });

  it("sorts categories by impact descending", () => {
    const byCategory = new Map([
      ["low", [{ priceUsd: 101, previousPriceUsd: 100, recordedAt: "2026-07-01T01:00:00Z" }]],
      ["high", [{ priceUsd: 150, previousPriceUsd: 100, recordedAt: "2026-07-01T01:00:00Z" }]],
    ]);
    const result = computeCategoryImpact(moves, byCategory, 24);
    expect(result[0].categoryId).toBe("high");
  });
});

describe("computeCatalogValueGrowth", () => {
  it("returns null with fewer than 2 snapshots", () => {
    expect(computeCatalogValueGrowth([{ date: "2026-07-01", totalValueUsd: 1000 }])).toBeNull();
  });

  it("computes growth percent between the earliest and latest snapshot", () => {
    const result = computeCatalogValueGrowth([
      { date: "2026-07-02", totalValueUsd: 1100 },
      { date: "2026-07-01", totalValueUsd: 1000 },
    ]);
    expect(result?.startValue).toBe(1000);
    expect(result?.endValue).toBe(1100);
    expect(result?.growthPercent).toBeCloseTo(10, 5);
  });
});

describe("computeBuyerSavings", () => {
  it("sums savings only where current price is below the observed high", () => {
    const result = computeBuyerSavings([
      { highestPriceUsd: 150, currentPriceUsd: 100 }, // 50 saved
      { highestPriceUsd: 100, currentPriceUsd: 120 }, // price went up, no savings
      { highestPriceUsd: 200, currentPriceUsd: 180 }, // 20 saved
    ]);
    expect(result.totalSavingsUsd).toBe(70);
    expect(result.offersWithSavings).toBe(2);
  });

  it("returns zero for an empty input", () => {
    expect(computeBuyerSavings([])).toEqual({ totalSavingsUsd: 0, offersWithSavings: 0 });
  });
});
