import { CatalogGrowthStrategy } from "../strategies/CatalogGrowthStrategy";
import { GrowthPriority, GrowthStrategyType, OpportunityCategory } from "../types/enums";
import type { GrowthContext } from "../domain/GrowthContext";
import type { ExecutiveSummary } from "@/src/domains/merchant-intelligence/types/merchant-intelligence.types";
import type { CatalogIntelligence } from "@/src/domains/merchant-intelligence/types/merchant-intelligence.types";
import type { MerchantAnalyticsSummary } from "@/src/domains/merchant-analytics/types/analytics.types";
import type { ProductAnalyticsResult } from "@/src/domains/merchant-analytics/types/analytics.types";
import { AnalyticsWindow } from "@/src/domains/merchant-analytics/types/enums";

const strategy = new CatalogGrowthStrategy();

function makeContext(overrides: Partial<ExecutiveSummary> = {}, catalogOverrides: Partial<CatalogIntelligence> = {}): GrowthContext {
  const summary: ExecutiveSummary = {
    merchantId: "m1",
    companyName: "Loja Teste",
    plan: "free",
    totalProducts: 10,
    activeProducts: 8,
    incompleteProducts: 0,
    trustScore: 70,
    verificationCount: 1,
    activeSignalCount: 3,
    totalReviews: 5,
    averageRating: 4.5,
    contactsAvailable: 2,
    contactsTotal: 3,
    lastImportAt: new Date().toISOString(),
    lastImportSuccess: true,
    daysSinceLastImport: 5,
    onboardingDone: true,
    verifiedLevel: "basic",
    merchantScore: 65,
    generatedAt: new Date().toISOString(),
    ...overrides,
  };

  const catalog: CatalogIntelligence = {
    merchantId: "m1",
    totalProducts: 10,
    healthScore: 85,
    issues: [],
    insights: [],
    lastImportAt: new Date().toISOString(),
    daysSinceLastImport: 5,
    generatedAt: new Date().toISOString(),
    ...catalogOverrides,
  };

  const analytics: MerchantAnalyticsSummary = {
    merchant_id: "m1",
    window: AnalyticsWindow.Last30Days,
    views: 0, unique_visitors: 0, product_impressions: 0,
    product_clicks: 0, contact_clicks: 0, whatsapp_clicks: 0,
    phone_clicks: 0, website_clicks: 0, offer_saves: 0, ctr: 0,
    generated_at: new Date().toISOString(),
  };

  const products: ProductAnalyticsResult = {
    merchant_id: "m1",
    window: AnalyticsWindow.Last30Days,
    products: [],
    total_analyzed: 0,
    generated_at: new Date().toISOString(),
  };

  return {
    merchant: { id: "m1", company_name: "Loja Teste" } as never,
    summary,
    catalog,
    analytics,
    products,
    timestamp: new Date().toISOString(),
  };
}

describe("CatalogGrowthStrategy", () => {
  it("registers correct id and category", () => {
    expect(strategy.id).toBe(GrowthStrategyType.CatalogGrowth);
  });

  it("returns first_import recommendation when no products", () => {
    const ctx = makeContext({ totalProducts: 0 });
    const recs = strategy.evaluate(ctx);
    expect(recs).toHaveLength(1);
    expect(recs[0].subcategory).toBe("first_import");
    expect(recs[0].priority).toBe(GrowthPriority.Critical);
    expect(recs[0].opportunity_category).toBe(OpportunityCategory.IncompleteCatalog);
  });

  it("returns completeness recommendation for incomplete products", () => {
    const ctx = makeContext({ totalProducts: 10, incompleteProducts: 15 });
    const recs = strategy.evaluate(ctx);
    const rec = recs.find((r) => r.subcategory === "completeness");
    expect(rec).toBeDefined();
    expect(rec!.priority).toBe(GrowthPriority.High);
  });

  it("returns quality recommendation when catalog health < 70", () => {
    const ctx = makeContext({ totalProducts: 10 }, { healthScore: 60 });
    const recs = strategy.evaluate(ctx);
    const rec = recs.find((r) => r.subcategory === "quality");
    expect(rec).toBeDefined();
    expect(rec!.priority).toBe(GrowthPriority.Medium);
  });

  it("returns expansion recommendation when < 20 products", () => {
    const ctx = makeContext({ totalProducts: 8 }, { healthScore: 85 });
    const recs = strategy.evaluate(ctx);
    const rec = recs.find((r) => r.subcategory === "expansion");
    expect(rec).toBeDefined();
    expect(rec!.opportunity_category).toBe(OpportunityCategory.LowCoverage);
  });
});
