import type { SupabaseClient } from "@supabase/supabase-js";
import { EventPlatformService } from "@/src/domains/merchant-analytics/services/EventPlatformService";
import { SessionService } from "@/src/domains/merchant-analytics/services/SessionService";
import { EventStreamService } from "@/src/domains/merchant-analytics/services/EventStreamService";
import { MerchantAnalyticsService } from "@/src/domains/merchant-analytics/services/MerchantAnalyticsService";
import { FunnelService } from "@/src/domains/merchant-analytics/services/FunnelService";
import { AnalyticsObservabilityService } from "@/src/domains/merchant-analytics/services/AnalyticsObservabilityService";
import { SupabaseAnalyticsEventRepository } from "@/src/domains/merchant-analytics/infrastructure/SupabaseAnalyticsEventRepository";
import { SupabaseSessionRepository } from "@/src/domains/merchant-analytics/infrastructure/SupabaseSessionRepository";

export function createAnalyticsServices(client: SupabaseClient) {
  const eventRepo = new SupabaseAnalyticsEventRepository(client);
  const sessionRepo = new SupabaseSessionRepository(client);

  return {
    eventPlatform: new EventPlatformService(eventRepo, sessionRepo),
    session: new SessionService(sessionRepo),
    eventStream: new EventStreamService(eventRepo, sessionRepo),
    merchantAnalytics: new MerchantAnalyticsService(eventRepo),
    funnel: new FunnelService(eventRepo),
    observability: new AnalyticsObservabilityService(eventRepo, sessionRepo),
  };
}
