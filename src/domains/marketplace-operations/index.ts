// Public API of the Marketplace Operations domain (Release 1.8 — Program 0 — Wave 1).
// Import from here rather than reaching into subfolders directly.

export * from "./types";

export { scoreMarketplaceHealth, HEALTH_FACTOR_WEIGHTS } from "./scoring/HealthScoring";
export type { FactorInput } from "./scoring/HealthScoring";
export { scoreMerchantPriority, PRIORITY_FACTOR_WEIGHTS } from "./scoring/PriorityScoring";
export type { PriorityFactorInputs } from "./scoring/PriorityScoring";
export { findCoverageGaps, LOW_COVERAGE_PRODUCT_THRESHOLD } from "./scoring/CoverageScoring";

export { MarketplaceMetricsService } from "./metrics/MarketplaceMetricsService";
export { MarketplaceHealthEngine } from "./health/MarketplaceHealthEngine";

export { MerchantPriorityService } from "./services/MerchantPriorityService";
export { MarketplaceCoverageService } from "./services/MarketplaceCoverageService";
export { MarketplaceAlertService } from "./services/MarketplaceAlertService";
export { MarketplaceSnapshotService } from "./services/MarketplaceSnapshotService";
export * as AlertRules from "./services/AlertRules";

export { MarketplaceOperationsDashboardService } from "./dashboard/MarketplaceOperationsDashboardService";
export type { MarketplaceOperationsOverview } from "./dashboard/MarketplaceOperationsDashboardService";

export { SupabaseMarketplaceSnapshotRepository } from "./infrastructure/SupabaseMarketplaceSnapshotRepository";
export { SupabaseMarketplaceAlertRepository } from "./infrastructure/SupabaseMarketplaceAlertRepository";
export type { IMarketplaceSnapshotRepository } from "./repositories/IMarketplaceSnapshotRepository";
export type { IMarketplaceAlertRepository } from "./repositories/IMarketplaceAlertRepository";
