// ── Domain: merchant-analytics ───────────────────────────────────────────────
// Behavioral event platform for buyer analytics.
// All event storage is append-only. Never delete buyer_events rows.

export * from "./types";
export { EventPlatformService } from "./services/EventPlatformService";
export { SessionService } from "./services/SessionService";
export { EventStreamService } from "./services/EventStreamService";
export { MerchantAnalyticsService } from "./services/MerchantAnalyticsService";
export { FunnelService } from "./services/FunnelService";
export { AnalyticsObservabilityService } from "./services/AnalyticsObservabilityService";
export { windowToDate, windowLabel } from "./services/WindowHelper";
export { SupabaseAnalyticsEventRepository } from "./infrastructure/SupabaseAnalyticsEventRepository";
export { SupabaseSessionRepository } from "./infrastructure/SupabaseSessionRepository";
