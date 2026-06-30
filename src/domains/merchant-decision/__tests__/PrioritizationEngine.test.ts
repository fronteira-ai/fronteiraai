import { PrioritizationEngine } from "../services/PrioritizationEngine";
import {
  RecommendationCategory,
  RecommendationPriority,
  EstimatedEffort,
  RecommendationStatus,
} from "../types/enums";
import type { Recommendation } from "../types/decision.types";

function makeRec(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: "rec-1",
    rule_id: "test.rule",
    category: RecommendationCategory.Catalog,
    priority: RecommendationPriority.Medium,
    title: "Test Recommendation",
    description: "Test",
    expected_impact: "Medium improvement",
    estimated_effort: EstimatedEffort.Hours,
    estimated_minutes: 60,
    reason: "Test reason",
    evidence: [],
    data_sources: [],
    action_url: null,
    action_label: null,
    status: RecommendationStatus.Active,
    created_at: new Date().toISOString(),
    expires_at: null,
    ...overrides,
  };
}

describe("PrioritizationEngine", () => {
  let engine: PrioritizationEngine;

  beforeEach(() => {
    engine = new PrioritizationEngine();
  });

  describe("score()", () => {
    it("returns a numeric score with breakdown", () => {
      const rec = makeRec();
      const result = engine.score(rec);
      expect(typeof result.score).toBe("number");
      expect(result.score).toBeGreaterThan(0);
      expect(result.score_breakdown).toHaveProperty("impact_score");
      expect(result.score_breakdown).toHaveProperty("effort_score");
      expect(result.score_breakdown).toHaveProperty("urgency_score");
      expect(result.score_breakdown).toHaveProperty("category_weight");
    });

    it("Critical + Minutes gets maximum urgency bonus (15)", () => {
      const rec = makeRec({ priority: RecommendationPriority.Critical, estimated_effort: EstimatedEffort.Minutes });
      const result = engine.score(rec);
      expect(result.score_breakdown.urgency_score).toBe(15);
    });

    it("Critical + Days gets base urgency bonus (10)", () => {
      const rec = makeRec({ priority: RecommendationPriority.Critical, estimated_effort: EstimatedEffort.Days });
      const result = engine.score(rec);
      expect(result.score_breakdown.urgency_score).toBe(10);
    });

    it("Low priority + Days gets zero urgency", () => {
      const rec = makeRec({ priority: RecommendationPriority.Low, estimated_effort: EstimatedEffort.Days });
      const result = engine.score(rec);
      expect(result.score_breakdown.urgency_score).toBe(0);
    });

    it("Critical outscores Low with same effort and category", () => {
      const critical = makeRec({ priority: RecommendationPriority.Critical, estimated_effort: EstimatedEffort.Hours });
      const low = makeRec({ priority: RecommendationPriority.Low, estimated_effort: EstimatedEffort.Hours });
      expect(engine.score(critical).score).toBeGreaterThan(engine.score(low).score);
    });

    it("Minutes effort outscores Days effort with same priority and category", () => {
      const fast = makeRec({ priority: RecommendationPriority.High, estimated_effort: EstimatedEffort.Minutes });
      const slow = makeRec({ priority: RecommendationPriority.High, estimated_effort: EstimatedEffort.Days });
      expect(engine.score(fast).score).toBeGreaterThan(engine.score(slow).score);
    });
  });

  describe("sort()", () => {
    it("returns higher-scored items first", () => {
      const low = makeRec({ id: "low", priority: RecommendationPriority.Low, estimated_effort: EstimatedEffort.Days });
      const high = makeRec({ id: "high", priority: RecommendationPriority.Critical, estimated_effort: EstimatedEffort.Minutes });
      const sorted = engine.sort([low, high]);
      expect(sorted[0].id).toBe("high");
    });

    it("does not mutate the original array", () => {
      const recs = [
        makeRec({ id: "a", priority: RecommendationPriority.Low }),
        makeRec({ id: "b", priority: RecommendationPriority.Critical }),
      ];
      const original = [...recs];
      engine.sort(recs);
      expect(recs[0].id).toBe(original[0].id);
    });
  });

  describe("todaysPriorities()", () => {
    it("returns at most 5 recommendations by default", () => {
      const recs = Array.from({ length: 8 }, (_, i) =>
        makeRec({ id: `rec-${i}`, priority: RecommendationPriority.Medium })
      );
      const priorities = engine.todaysPriorities(recs);
      expect(priorities.length).toBeLessThanOrEqual(5);
    });

    it("respects custom limit", () => {
      const recs = Array.from({ length: 8 }, (_, i) =>
        makeRec({ id: `rec-${i}`, priority: RecommendationPriority.Medium })
      );
      const priorities = engine.todaysPriorities(recs, 3);
      expect(priorities.length).toBeLessThanOrEqual(3);
    });

    it("returns all if count is below limit", () => {
      const recs = [makeRec({ id: "only" })];
      const priorities = engine.todaysPriorities(recs, 5);
      expect(priorities.length).toBe(1);
    });
  });
});
