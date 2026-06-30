import type { SupabaseClient } from "@supabase/supabase-js";
import type { DecisionContext } from "../types/decision.types";
import type { Merchant } from "@/types/merchant";
import { buildExecutiveSummary } from "@/src/domains/merchant-intelligence/services/ExecutiveSummaryService";
import { buildMerchantHealth } from "@/src/domains/merchant-intelligence/services/MerchantHealthService";
import { buildCatalogIntelligence } from "@/src/domains/merchant-intelligence/services/CatalogIntelligenceService";
import { MerchantAnalyticsService } from "@/src/domains/merchant-analytics/services/MerchantAnalyticsService";
import { SupabaseAnalyticsEventRepository } from "@/src/domains/merchant-analytics/infrastructure/SupabaseAnalyticsEventRepository";
import { AnalyticsWindow } from "@/src/domains/merchant-analytics/types/enums";

export class DecisionContextBuilder {
  constructor(private readonly serviceClient: SupabaseClient) {}

  async build(merchant: Merchant): Promise<DecisionContext> {
    // Fetch store IDs for this merchant
    const { data: storeRows } = await this.serviceClient
      .from("stores")
      .select("id")
      .eq("merchant_id", merchant.id);
    const storeIds = (storeRows ?? []).map((s: { id: string }) => s.id);

    const eventRepo = new SupabaseAnalyticsEventRepository(this.serviceClient);
    const analyticsSvc = new MerchantAnalyticsService(eventRepo);

    const [summary, catalog, analyticsSummary, analyticsProducts] = await Promise.all([
      buildExecutiveSummary(merchant, this.serviceClient),
      buildCatalogIntelligence(merchant.id, storeIds, this.serviceClient),
      analyticsSvc.getSummary(merchant.id, AnalyticsWindow.Last30Days),
      analyticsSvc.getProductAnalytics(merchant.id, AnalyticsWindow.Last30Days),
    ]);

    const health = buildMerchantHealth(summary);

    return {
      merchant,
      summary,
      health,
      catalog,
      analytics: analyticsSummary,
      products: analyticsProducts,
    };
  }
}
