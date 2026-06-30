import type { SupabaseClient } from "@supabase/supabase-js";
import type { Merchant } from "@/types/merchant";
import type { GrowthContext } from "../domain/GrowthContext";
import { buildExecutiveSummary } from "@/src/domains/merchant-intelligence/services/ExecutiveSummaryService";
import { buildCatalogIntelligence } from "@/src/domains/merchant-intelligence/services/CatalogIntelligenceService";
import { MerchantAnalyticsService } from "@/src/domains/merchant-analytics/services/MerchantAnalyticsService";
import { SupabaseAnalyticsEventRepository } from "@/src/domains/merchant-analytics/infrastructure/SupabaseAnalyticsEventRepository";
import { AnalyticsWindow } from "@/src/domains/merchant-analytics/types/enums";

export class GrowthContextBuilder {
  constructor(private readonly serviceClient: SupabaseClient) {}

  async build(merchant: Merchant): Promise<GrowthContext> {
    const { data: storeRows } = await this.serviceClient
      .from("stores")
      .select("id")
      .eq("merchant_id", merchant.id);
    const storeIds = (storeRows ?? []).map((s: { id: string }) => s.id);

    const eventRepo = new SupabaseAnalyticsEventRepository(this.serviceClient);
    const analyticsSvc = new MerchantAnalyticsService(eventRepo);

    const [summary, catalog, analytics, products] = await Promise.all([
      buildExecutiveSummary(merchant, this.serviceClient),
      buildCatalogIntelligence(merchant.id, storeIds, this.serviceClient),
      analyticsSvc.getSummary(merchant.id, AnalyticsWindow.Last30Days),
      analyticsSvc.getProductAnalytics(merchant.id, AnalyticsWindow.Last30Days),
    ]);

    return {
      merchant,
      summary,
      catalog,
      analytics,
      products,
      timestamp: new Date().toISOString(),
    };
  }
}
