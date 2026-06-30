import { TrustGrowthStrategy } from "../strategies/TrustGrowthStrategy";
import { GrowthPriority, GrowthStrategyType, OpportunityCategory } from "../types/enums";
import type { GrowthContext } from "../domain/GrowthContext";
import type { ExecutiveSummary } from "@/src/domains/merchant-intelligence/types/merchant-intelligence.types";
import type { CatalogIntelligence } from "@/src/domains/merchant-intelligence/types/merchant-intelligence.types";
import type { MerchantAnalyticsSummary, ProductAnalyticsResult } from "@/src/domains/merchant-analytics/types/analytics.types";
import { AnalyticsWindow } from "@/src/domains/merchant-analytics/types/enums";

const strategy = new TrustGrowthStrategy();

function makeCtx(overrides: Partial<ExecutiveSummary> = {}): GrowthContext {
  const summary: ExecutiveSummary = {
    merchantId: "m1", companyName: "Loja", plan: "free",
    totalProducts: 10, activeProducts: 10, incompleteProducts: 0,
    trustScore: 75, verificationCount: 1, activeSignalCount: 3,
    totalReviews: 3, averageRating: 4.0,
    contactsAvailable: 2, contactsTotal: 3,
    lastImportAt: null, lastImportSuccess: null, daysSinceLastImport: null,
    onboardingDone: true, verifiedLevel: "basic",
    merchantScore: 65, generatedAt: new Date().toISOString(),
    ...overrides,
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

describe("TrustGrowthStrategy", () => {
  it("registers correct id", () => {
    expect(strategy.id).toBe(GrowthStrategyType.TrustGrowth);
  });

  it("returns first_verification when no verifications", () => {
    const ctx = makeCtx({ verificationCount: 0 });
    const recs = strategy.evaluate(ctx);
    expect(recs.find((r) => r.subcategory === "first_verification")).toBeDefined();
    expect(recs.find((r) => r.subcategory === "first_verification")!.priority).toBe(GrowthPriority.Critical);
  });

  it("does NOT return first_verification when verified", () => {
    const ctx = makeCtx({ verificationCount: 1, trustScore: 70 });
    const recs = strategy.evaluate(ctx);
    expect(recs.find((r) => r.subcategory === "first_verification")).toBeUndefined();
  });

  it("returns trust_score rec when verified but score < 50", () => {
    const ctx = makeCtx({ verificationCount: 1, trustScore: 30 });
    const recs = strategy.evaluate(ctx);
    const rec = recs.find((r) => r.subcategory === "trust_score");
    expect(rec).toBeDefined();
    expect(rec!.priority).toBe(GrowthPriority.High);
    expect(rec!.opportunity_category).toBe(OpportunityCategory.IncompleteTrust);
  });

  it("returns add_signals when < 2 active signals and verified", () => {
    const ctx = makeCtx({ verificationCount: 1, activeSignalCount: 1, trustScore: 70 });
    const recs = strategy.evaluate(ctx);
    expect(recs.find((r) => r.subcategory === "add_signals")).toBeDefined();
  });
});
