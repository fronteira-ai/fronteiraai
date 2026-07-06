import { VolatilityEngine, type PriceMovePoint } from "../volatility/VolatilityEngine";
import { VolatilityClass } from "../enums";

function point(daysAgo: number, percentChange: number): PriceMovePoint {
  return { occurredAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000), percentChange };
}

describe("VolatilityEngine", () => {
  const engine = new VolatilityEngine();

  it("scores a product with fewer than 2 price points as MuitoEstavel / 0", () => {
    const result = engine.score("product-1", [], 30);
    expect(result.score).toBe(0);
    expect(result.classification).toBe(VolatilityClass.MuitoEstavel);
    expect(result.sampleSize).toBe(0);
  });

  it("scores a highly volatile product (frequent, large, one-directional, recent changes) high", () => {
    const points: PriceMovePoint[] = Array.from({ length: 30 }, (_, i) => point(i / 6, -0.1));
    const result = engine.score("product-1", points, 30);

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.classification).toBe(VolatilityClass.MuitoVolatil);
    expect(result.factors.persistence).toBeCloseTo(1, 5);
  });

  it("scores a product with rare, tiny, oscillating changes low", () => {
    const points: PriceMovePoint[] = [point(25, 0.01), point(5, -0.01)];
    const result = engine.score("product-1", points, 30);

    expect(result.score).toBeLessThan(40);
    expect(result.factors.persistence).toBeCloseTo(0, 5);
  });

  it("keeps every factor within [0, 1]", () => {
    const points: PriceMovePoint[] = Array.from({ length: 100 }, (_, i) => point(0, i % 2 === 0 ? 0.5 : -0.5));
    const result = engine.score("product-1", points, 1);

    for (const value of Object.values(result.factors)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("a larger average amplitude never produces a lower score, all else equal", () => {
    const smallSwing = Array.from({ length: 10 }, (_, i) => point(9 - i, i % 2 === 0 ? 0.02 : -0.02));
    const largeSwing = Array.from({ length: 10 }, (_, i) => point(9 - i, i % 2 === 0 ? 0.2 : -0.2));

    const small = engine.score("product-1", smallSwing, 30);
    const large = engine.score("product-1", largeSwing, 30);

    expect(large.factors.amplitude).toBeGreaterThan(small.factors.amplitude);
    expect(large.score).toBeGreaterThanOrEqual(small.score);
  });
});
