import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseMarketChangeRepository } from "@/src/domains/realtime-commerce/infrastructure/SupabaseMarketChangeRepository";
import { SupabaseMarketPulseSnapshotRepository } from "@/src/domains/realtime-commerce/infrastructure/SupabaseMarketPulseSnapshotRepository";
import { SupabaseBuyerAlertCandidateRepository } from "@/src/domains/realtime-commerce/infrastructure/SupabaseBuyerAlertCandidateRepository";
import { ChangeDetectionService } from "@/src/domains/realtime-commerce/change-detection/ChangeDetectionService";
import { VolatilityService } from "@/src/domains/realtime-commerce/volatility/VolatilityService";
import { FreshnessService } from "@/src/domains/realtime-commerce/freshness/FreshnessService";
import { StoreUpdateIntelligenceService } from "@/src/domains/realtime-commerce/services/StoreUpdateIntelligenceService";
import { MarketPulseService } from "@/src/domains/realtime-commerce/market-pulse/MarketPulseService";
import { LiveActivityFeedService } from "@/src/domains/realtime-commerce/market-pulse/LiveActivityFeedService";
import { BuyerAlertService } from "@/src/domains/realtime-commerce/alerts/BuyerAlertService";
import { RealtimeCommerceDashboardService } from "@/src/domains/realtime-commerce/dashboard/RealtimeCommerceDashboardService";

export function createRealtimeCommerceServices(client: SupabaseClient) {
  const changeRepo = new SupabaseMarketChangeRepository(client);
  const pulseSnapshotRepo = new SupabaseMarketPulseSnapshotRepository(client);
  const alertCandidateRepo = new SupabaseBuyerAlertCandidateRepository(client);

  const changeDetectionService = new ChangeDetectionService(changeRepo);
  const volatilityService = new VolatilityService(changeRepo);
  const freshnessService = new FreshnessService(changeRepo);
  const storeUpdateService = new StoreUpdateIntelligenceService(changeRepo);
  const marketPulseService = new MarketPulseService(client, changeRepo);
  const liveActivityFeedService = new LiveActivityFeedService(client, changeRepo);
  const buyerAlertService = new BuyerAlertService(changeRepo, alertCandidateRepo);

  const dashboardService = new RealtimeCommerceDashboardService(
    client,
    changeRepo,
    marketPulseService,
    liveActivityFeedService,
    storeUpdateService,
    buyerAlertService
  );

  return {
    changeRepo,
    pulseSnapshotRepo,
    alertCandidateRepo,
    changeDetectionService,
    volatilityService,
    freshnessService,
    storeUpdateService,
    marketPulseService,
    liveActivityFeedService,
    buyerAlertService,
    dashboardService,
  };
}
