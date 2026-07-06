// Public API of the Real-Time Commerce Engine (Release 1.8 — Program A —
// Wave 2). Every domain that displays a price, a stock state, or a catalog
// entry can depend on this one for change detection, freshness and
// volatility — import from here rather than reaching into subfolders.

export * from "./types";
export * from "./enums";

export { ChangeDetector, PROMOTION_PRICE_DROP_THRESHOLD } from "./change-detection/ChangeDetector";
export { ChangeDetectionService } from "./change-detection/ChangeDetectionService";

export { VolatilityEngine } from "./volatility/VolatilityEngine";
export type { PriceMovePoint } from "./volatility/VolatilityEngine";
export { VolatilityService } from "./volatility/VolatilityService";

export { FreshnessEngine } from "./freshness/FreshnessEngine";
export { FreshnessService } from "./freshness/FreshnessService";

export { StoreUpdateEngine } from "./services/StoreUpdateEngine";
export { StoreUpdateIntelligenceService } from "./services/StoreUpdateIntelligenceService";
export type { StoreUpdateOptions } from "./services/StoreUpdateIntelligenceService";

export { MarketPulseService } from "./market-pulse/MarketPulseService";
export { LiveActivityFeedService } from "./market-pulse/LiveActivityFeedService";

export { BuyerAlertEngine } from "./alerts/BuyerAlertEngine";
export { BuyerAlertService } from "./alerts/BuyerAlertService";

export { RealtimeCommerceDashboardService } from "./dashboard/RealtimeCommerceDashboardService";
export type { RealtimeCommerceOverview } from "./dashboard/RealtimeCommerceDashboardService";

export type { IMarketChangeRepository, CountFilter } from "./repositories/IMarketChangeRepository";
export type { IMarketPulseSnapshotRepository } from "./repositories/IMarketPulseSnapshotRepository";
export type { IBuyerAlertCandidateRepository } from "./repositories/IBuyerAlertCandidateRepository";

export { SupabaseMarketChangeRepository } from "./infrastructure/SupabaseMarketChangeRepository";
export { SupabaseMarketPulseSnapshotRepository } from "./infrastructure/SupabaseMarketPulseSnapshotRepository";
export { SupabaseBuyerAlertCandidateRepository } from "./infrastructure/SupabaseBuyerAlertCandidateRepository";

export type { RealtimeCommerceDomainEvent } from "./events/RealtimeCommerceDomainEvent";
