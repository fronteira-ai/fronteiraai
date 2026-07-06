import type { SupabaseClient } from "@supabase/supabase-js";
import { PriceIntelligenceService, VolatilityRollupService, PriceHistoryQueryService, MarketPulseInsightsService } from "@/src/domains/market-insights";
import { createCanonicalCatalogServices } from "./canonical-catalog-factory";
import { createRealtimeCommerceServices } from "./realtime-commerce-factory";

// Release 1.9 — Program F — Wave 1 (Premium Home Experience). Same
// composition pattern as every other `lib/*-factory.ts` — market-insights/
// (Release 1.8 — Program C — Wave 1) never had one yet because nothing
// consumed it outside its own tests until the Home needed it. Reuses
// canonical-catalog-factory/realtime-commerce-factory instead of
// constructing their repositories a second time.
export function createMarketInsightsServices(client: SupabaseClient) {
  const { catalogRepo, priceHistoryService } = createCanonicalCatalogServices(client);
  const { changeRepo, volatilityService, marketPulseService } = createRealtimeCommerceServices(client);

  const priceIntelligenceService = new PriceIntelligenceService(catalogRepo);
  const volatilityRollupService = new VolatilityRollupService(catalogRepo, volatilityService, changeRepo);
  const priceHistoryQueryService = new PriceHistoryQueryService(catalogRepo, priceHistoryService, volatilityRollupService, changeRepo);
  const marketPulseInsightsService = new MarketPulseInsightsService(marketPulseService, catalogRepo);

  return {
    priceIntelligenceService,
    volatilityRollupService,
    priceHistoryQueryService,
    marketPulseInsightsService,
  };
}
