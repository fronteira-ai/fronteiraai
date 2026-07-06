import { StoreUpdateEngine, type StoreUpdateInputs } from "../services/StoreUpdateEngine";

function inputs(overrides: Partial<StoreUpdateInputs> = {}): StoreUpdateInputs {
  return {
    updateIntervalMinutes: 60,
    reactionSpeedHours: 12,
    catalogStability: 0.9,
    freshnessScore: 80,
    ...overrides,
  };
}

describe("StoreUpdateEngine", () => {
  const engine = new StoreUpdateEngine();

  it("rewards a store that updates constantly, reacts instantly, is stable and fresh", () => {
    const result = engine.compute(
      inputs({ updateIntervalMinutes: 0, reactionSpeedHours: 0, catalogStability: 1, freshnessScore: 100 })
    );
    expect(result.updateScore).toBe(100);
    expect(result.marketResponsiveness).toBe(100);
  });

  it("penalizes a store that never updates, reacts slowly, is unstable and stale", () => {
    const result = engine.compute(
      inputs({ updateIntervalMinutes: 24 * 60, reactionSpeedHours: 72, catalogStability: 0, freshnessScore: 0 })
    );
    expect(result.updateScore).toBe(0);
    expect(result.marketResponsiveness).toBe(0);
  });

  it("treats an unknown reaction speed as neutral, not penalized to zero", () => {
    const withUnknown = engine.compute(inputs({ reactionSpeedHours: null }));
    const withSlow = engine.compute(inputs({ reactionSpeedHours: 72 }));
    expect(withUnknown.updateScore).toBeGreaterThan(withSlow.updateScore);
  });

  it("treats a null update interval as zero update frequency", () => {
    const result = engine.compute(inputs({ updateIntervalMinutes: null }));
    const baseline = engine.compute(inputs());
    expect(result.updateScore).toBeLessThan(baseline.updateScore);
  });

  it("always returns scores within [0, 100]", () => {
    const result = engine.compute(
      inputs({ updateIntervalMinutes: -10, reactionSpeedHours: -5, catalogStability: 2, freshnessScore: 500 })
    );
    expect(result.updateScore).toBeGreaterThanOrEqual(0);
    expect(result.updateScore).toBeLessThanOrEqual(100);
    expect(result.marketResponsiveness).toBeGreaterThanOrEqual(0);
    expect(result.marketResponsiveness).toBeLessThanOrEqual(100);
  });
});
