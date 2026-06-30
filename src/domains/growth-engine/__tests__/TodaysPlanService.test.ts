import { TodaysPlanService } from "../services/TodaysPlanService";
import { GrowthCategory, GrowthStrategyType, GrowthPriority, GrowthEffort, GrowthStatus, PlanTier } from "../types/enums";
import type { GrowthRecommendation } from "../types/growth.types";

const service = new TodaysPlanService();

function makeScored(
  id: string,
  priority: GrowthPriority,
  tier: PlanTier,
  minutes = 10,
  score = 50
): GrowthRecommendation {
  return {
    id,
    strategy_id: GrowthStrategyType.CatalogGrowth,
    category: GrowthCategory.Catalog,
    subcategory: "sub",
    title: `Rec ${id}`,
    description: "d",
    explanation: "e",
    evidence: [],
    data_sources: [],
    expected_impact: "impact",
    estimated_effort: GrowthEffort.Minutes,
    estimated_minutes: minutes,
    priority,
    status: GrowthStatus.New,
    created_at: new Date().toISOString(),
    expires_at: null,
    action_url: "/test",
    action_label: "Go",
    plan_tier: tier,
    moat_strengthened: [],
    asset_strengthened: [],
    opportunity_category: null,
    priority_score: score,
    priority_breakdown: {
      impact_score: 20, urgency_score: 14, ease_score: 12, context_score: 4,
      total_score: score, reason: "Test reason",
    },
  };
}

describe("TodaysPlanService", () => {
  it("buildPlan returns at most maxItems free-tier items", () => {
    const scored = [
      makeScored("r1", GrowthPriority.High, PlanTier.Free, 10, 80),
      makeScored("r2", GrowthPriority.High, PlanTier.Free, 15, 75),
      makeScored("r3", GrowthPriority.Medium, PlanTier.Free, 5, 60),
      makeScored("r4", GrowthPriority.Medium, PlanTier.Free, 8, 55),
      makeScored("r5", GrowthPriority.Low, PlanTier.Free, 20, 40),
      makeScored("r6", GrowthPriority.Low, PlanTier.Free, 10, 35),
    ];
    const plan = service.buildPlan(scored, "m1", 5);
    expect(plan.plan_items.length).toBeLessThanOrEqual(5);
  });

  it("excludes premium items from plan", () => {
    const scored = [
      makeScored("r1", GrowthPriority.Critical, PlanTier.Premium, 10, 95),
      makeScored("r2", GrowthPriority.High, PlanTier.Free, 15, 80),
    ];
    const plan = service.buildPlan(scored, "m1");
    expect(plan.plan_items.every((r) => r.plan_tier === PlanTier.Free)).toBe(true);
  });

  it("counts premium_items_available correctly", () => {
    const scored = [
      makeScored("r1", GrowthPriority.Critical, PlanTier.Premium, 10, 95),
      makeScored("r2", GrowthPriority.High, PlanTier.Enterprise, 10, 85),
      makeScored("r3", GrowthPriority.High, PlanTier.Free, 10, 80),
    ];
    const plan = service.buildPlan(scored, "m1");
    expect(plan.premium_items_available).toBe(2);
  });

  it("estimated_total_minutes sums plan item minutes", () => {
    const scored = [
      makeScored("r1", GrowthPriority.High, PlanTier.Free, 10, 80),
      makeScored("r2", GrowthPriority.High, PlanTier.Free, 20, 75),
    ];
    const plan = service.buildPlan(scored, "m1");
    expect(plan.estimated_total_minutes).toBe(30);
  });

  it("total_available reflects all scored items", () => {
    const scored = Array.from({ length: 8 }, (_, i) =>
      makeScored(`r${i}`, GrowthPriority.Medium, PlanTier.Free, 5, 50)
    );
    const plan = service.buildPlan(scored, "m1", 5);
    expect(plan.total_available).toBe(8);
  });

  it("date is YYYY-MM-DD format", () => {
    const plan = service.buildPlan([], "m1");
    expect(plan.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
