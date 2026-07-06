import { FreshnessEngine } from "../freshness/FreshnessEngine";
import { FreshnessClass } from "../enums";

describe("FreshnessEngine", () => {
  const engine = new FreshnessEngine();
  const now = new Date("2026-07-03T12:00:00Z");

  function ago(seconds: number): Date {
    return new Date(now.getTime() - seconds * 1000);
  }

  it("classifies null lastChangeAt as Stale with score 0", () => {
    const result = engine.score("offer-1", null, now);
    expect(result.classification).toBe(FreshnessClass.Stale);
    expect(result.score).toBe(0);
    expect(result.ageSeconds).toBe(Number.POSITIVE_INFINITY);
  });

  it("classifies a change from 1 minute ago as Live with a high score", () => {
    const result = engine.score("offer-1", ago(60), now);
    expect(result.classification).toBe(FreshnessClass.Live);
    expect(result.score).toBeGreaterThan(90);
  });

  it("classifies a change from 30 minutes ago as Fresh", () => {
    const result = engine.score("offer-1", ago(30 * 60), now);
    expect(result.classification).toBe(FreshnessClass.Fresh);
  });

  it("classifies a change from 3 hours ago as Recent", () => {
    const result = engine.score("offer-1", ago(3 * 60 * 60), now);
    expect(result.classification).toBe(FreshnessClass.Recent);
  });

  it("classifies a change from 12 hours ago as Old", () => {
    const result = engine.score("offer-1", ago(12 * 60 * 60), now);
    expect(result.classification).toBe(FreshnessClass.Old);
  });

  it("classifies a change from 3 days ago as Stale with a low score", () => {
    const result = engine.score("offer-1", ago(3 * 24 * 60 * 60), now);
    expect(result.classification).toBe(FreshnessClass.Stale);
    expect(result.score).toBeLessThan(25);
  });

  it("score decreases monotonically as age increases", () => {
    const ages = [0, 60, 600, 3600, 21600, 86400, 7 * 86400];
    const scores = ages.map((s) => engine.score("offer-1", ago(s), now).score);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it("never returns a score outside [0, 100]", () => {
    const result = engine.score("offer-1", ago(30 * 24 * 60 * 60), now);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
