import { PriorityEngine } from "../services/PriorityEngine";
import { GrowthCategory, GrowthStrategyType, GrowthPriority, GrowthEffort, GrowthStatus, PlanTier } from "../types/enums";
import type { DraftRecommendation } from "../types/growth.types";
import type { GrowthContext } from "../domain/GrowthContext";
import type { ExecutiveSummary } from "@/src/domains/merchant-intelligence/types/merchant-intelligence.types";
import type { CatalogIntelligence } from "@/src/domains/merchant-intelligence/types/merchant-intelligence.types";
import type { MerchantAnalyticsSummary, ProductAnalyticsResult } from "@/src/domains/merchant-analytics/types/analytics.types";
import { AnalyticsWindow } from "@/src/domains/merchant-analytics/types/enums";

const engine = new PriorityEngine();

function makeCtx(merchantScore = 65): GrowthContext {
  const summary: ExecutiveSummary = {
    merchantId: "m1", companyName: "Loja", plan: "free",
    totalProducts: 10, activeProducts: 10, incompleteProducts: 0,
    trustScore: 75, verificationCount: 1, activeSignalCount: 3,
    totalReviews: 3, averageRating: 4.0,
    contactsAvailable: 2, contactsTotal: 3,
    lastImportAt: null, lastImportSuccess: null, daysSinceLastImport: null,
    onboardingDone: true, verifiedLevel: "basic",
    merchantScore, generatedAt: new Date().toISOString(),
  };
  const catalog: CatalogIntelligence = {
    merchantId: "m1", totalProducts: 10, healthScore: 85,
    issues: [], insights: [], lastImportAt: null, daysSinceLastImport: null,
    generatedAt: new Date().toISOString(),
  };
  const analytics: MerchantAnalyticsSummary = {
    merchant_id: "m1", window: AnalyticsWindow.Last30Days,
    views: 0, unique_visitors: 0, product_impressions: 0, product_clicks: 0,
    contact_clicks: 0, whatsapp_clicks: 0, phone_clicks: 0, website_clicks: 0,
    offer_saves: 0, ctr: 0, generated_at: new Date().toISOString(),
  };
  const products: ProductAnalyticsResult = {
    merchant_id: "m1", window: AnalyticsWindow.Last30Days, products: [],
    total_analyzed: 0, generated_at: new Date().toISOString(),
  };
  return {
    merchant: { id: "m1" } as never, summary, catalog, analytics, products,
    timestamp: new Date().toISOString(),
  };
}

function makeDraft(
  category: GrowthCategory,
  priority: GrowthPriority,
  effort: GrowthEffort
): DraftRecommendation {
  return {
    id: `${category}:${priority}:${effort}`,
    strategy_id: GrowthStrategyType.CatalogGrowth,
    category,
    subcategory: "test",
    title: "Test",
    description: "d",
    explanation: "e",
    evidence: [],
    data_sources: [],
    expected_impact: "impact",
    estimated_effort: effort,
    estimated_minutes: 5,
    priority,
    status: GrowthStatus.New,
    created_at: new Date().toISOString(),
    expires_at: null,
    action_url: "/test",
    action_label: "Go",
    plan_tier: PlanTier.Free,
    moat_strengthened: [],
    asset_strengthened: [],
    opportunity_category: null,
  };
}

describe("PriorityEngine", () => {
  it("score is capped at 100", () => {
    const draft = makeDraft(GrowthCategory.Trust, GrowthPriority.Critical, GrowthEffort.Minutes);
    const scored = engine.score(draft, makeCtx(20));
    expect(scored.priority_score).toBeLessThanOrEqual(100);
  });

  it("Trust Critical Minutes scores higher than Freshness Low Days", () => {
    const high = makeDraft(GrowthCategory.Trust, GrowthPriority.Critical, GrowthEffort.Minutes);
    const low = makeDraft(GrowthCategory.Freshness, GrowthPriority.Low, GrowthEffort.Days);
    const ctx = makeCtx(65);
    expect(engine.score(high, ctx).priority_score).toBeGreaterThan(engine.score(low, ctx).priority_score);
  });

  it("priority_breakdown has all 5 fields", () => {
    const draft = makeDraft(GrowthCategory.Catalog, GrowthPriority.High, GrowthEffort.Hours);
    const scored = engine.score(draft, makeCtx());
    expect(scored.priority_breakdown.impact_score).toBeDefined();
    expect(scored.priority_breakdown.urgency_score).toBeDefined();
    expect(scored.priority_breakdown.ease_score).toBeDefined();
    expect(scored.priority_breakdown.context_score).toBeDefined();
    expect(scored.priority_breakdown.reason).toBeDefined();
  });

  it("lower merchantScore yields higher context_score (more context boost)", () => {
    const draft = makeDraft(GrowthCategory.Catalog, GrowthPriority.Medium, GrowthEffort.Hours);
    const scored30 = engine.score(draft, makeCtx(30));
    const scored80 = engine.score(draft, makeCtx(80));
    expect(scored30.priority_breakdown.context_score).toBeGreaterThan(scored80.priority_breakdown.context_score);
  });

  it("scoreAll returns sorted descending by priority_score", () => {
    const drafts = [
      makeDraft(GrowthCategory.Freshness, GrowthPriority.Low, GrowthEffort.Days),
      makeDraft(GrowthCategory.Trust, GrowthPriority.Critical, GrowthEffort.Minutes),
      makeDraft(GrowthCategory.Catalog, GrowthPriority.High, GrowthEffort.Hours),
    ];
    const scored = engine.scoreAll(drafts, makeCtx());
    for (let i = 1; i < scored.length; i++) {
      expect(scored[i - 1].priority_score).toBeGreaterThanOrEqual(scored[i].priority_score);
    }
  });

  it("todaysPlan returns at most maxItems", () => {
    const drafts = Array.from({ length: 10 }, () =>
      makeDraft(GrowthCategory.Trust, GrowthPriority.Medium, GrowthEffort.Hours)
    );
    const scored = engine.scoreAll(drafts, makeCtx());
    expect(engine.todaysPlan(scored, 3)).toHaveLength(3);
  });

  it("effort Minutes scores higher ease than Days", () => {
    const draftMin = makeDraft(GrowthCategory.Catalog, GrowthPriority.Medium, GrowthEffort.Minutes);
    const draftDay = makeDraft(GrowthCategory.Catalog, GrowthPriority.Medium, GrowthEffort.Days);
    const ctx = makeCtx();
    expect(engine.score(draftMin, ctx).priority_breakdown.ease_score).toBeGreaterThan(
      engine.score(draftDay, ctx).priority_breakdown.ease_score
    );
  });

  it("reason string is non-empty", () => {
    const draft = makeDraft(GrowthCategory.Trust, GrowthPriority.Critical, GrowthEffort.Minutes);
    const scored = engine.score(draft, makeCtx());
    expect(scored.priority_breakdown.reason.length).toBeGreaterThan(0);
  });

  it("priority_score equals sum of its components (capped at 100)", () => {
    const draft = makeDraft(GrowthCategory.Review, GrowthPriority.Low, GrowthEffort.Days);
    const ctx = makeCtx(90);
    const scored = engine.score(draft, ctx);
    const { impact_score, urgency_score, ease_score, context_score } = scored.priority_breakdown;
    const expected = Math.min(impact_score + urgency_score + ease_score + context_score, 100);
    expect(scored.priority_score).toBe(expected);
  });

  it("scoreAll with empty array returns empty", () => {
    expect(engine.scoreAll([], makeCtx())).toHaveLength(0);
  });
});
