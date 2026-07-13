import type { SupabaseClient } from "@supabase/supabase-js";
import { ComparisonIntelligenceComposer, ProductIntelligenceComposer, SearchIntelligenceComposer } from "@/src/domains/buyer-intelligence";
import { createCanonicalCatalogServices } from "./canonical-catalog-factory";
import { createMarketInsightsServices } from "./market-insights-factory";
import { createRealtimeCommerceServices } from "./realtime-commerce-factory";
import { SupabaseMerchantStoreLinkRepository } from "@/src/domains/merchant-ownership/infrastructure/SupabaseMerchantStoreLinkRepository";
import { BadgeService } from "@/src/domains/trust/services/BadgeService";
import { SupabaseBadgeRepository, SupabaseTrustRepository, SupabaseTrustEventRepository } from "@/src/domains/trust/infrastructure";

// Release 2.0 — Wave 1. Same composition pattern as every other
// `lib/*-factory.ts` — reuses the existing canonical-catalog/market-insights/
// realtime-commerce factories instead of constructing their repositories a
// second time. Trust has no dedicated factory yet (its services are built
// inline at each route today, e.g. app/api/trust/merchant/[merchantId]/
// signals/route.ts) — mirrored here rather than introducing one repo-wide.
export function createBuyerIntelligenceServices(client: SupabaseClient) {
  const { catalogRepo, compareFoundationService } = createCanonicalCatalogServices(client);
  const { priceIntelligenceService } = createMarketInsightsServices(client);
  const { freshnessService } = createRealtimeCommerceServices(client);

  const merchantStoreLinkRepo = new SupabaseMerchantStoreLinkRepository(client);
  const badgeService = new BadgeService(
    new SupabaseBadgeRepository(client),
    new SupabaseTrustRepository(client),
    new SupabaseTrustEventRepository(client)
  );

  const comparisonComposer = new ComparisonIntelligenceComposer(
    compareFoundationService,
    catalogRepo,
    priceIntelligenceService,
    freshnessService,
    merchantStoreLinkRepo,
    badgeService
  );
  const productComposer = new ProductIntelligenceComposer(catalogRepo, comparisonComposer);
  const searchComposer = new SearchIntelligenceComposer(catalogRepo, priceIntelligenceService);

  return { comparisonComposer, productComposer, searchComposer };
}
