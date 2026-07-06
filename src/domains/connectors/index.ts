// Public API of the Connector Platform domain.
// Import from here to build new connectors or integrate with the sync pipeline.

export * from "./types";

export { connectorRegistry } from "./services/ConnectorRegistry";
export { SyncOrchestrator } from "./services/SyncOrchestrator";
export type { SyncOrchestratorOptions, SyncRunOptions, SyncRunOutcome } from "./services/SyncOrchestrator";
export { ManualSyncTrigger } from "./scheduler/ManualSyncTrigger";
export type { ISyncScheduler, ScheduledConnector } from "./scheduler/ISyncScheduler";

export { validateOffer, ValidationStage } from "./services/stages/ValidationStage";
export { NormalizationStage } from "./services/stages/NormalizationStage";
export { DeduplicationStage } from "./services/stages/DeduplicationStage";
export { ProductIdentityShadowStage } from "./services/stages/ProductIdentityShadowStage";
export { MediaStage } from "./services/stages/MediaStage";
export { CatalogWriteStage } from "./services/stages/CatalogWriteStage";

export { normalizeOffer } from "./normalization/OfferNormalizer";

export { JsonFieldMapper } from "./mapping/JsonFieldMapper";
export { CsvFieldMapper } from "./mapping/CsvFieldMapper";
export type { CsvFieldMap } from "./mapping/CsvFieldMapper";

export { bootstrapConnectors } from "./crawler/bootstrap";
export { JsonFileConnector } from "./crawler/reference/JsonFileConnector";
export { CsvFileConnector } from "./crawler/reference/CsvFileConnector";
export { ShoppingChinaConnector } from "./crawler/shoppingchina";
export { HttpFetchStrategy, RateLimitedFetchStrategy } from "./sdk/fetch";
export type { IFetchStrategy, FetchOptions, FetchResult } from "./sdk/fetch";
export { SitemapCrawler, DeltaImportPlanner } from "./sdk/sitemap";
export type { SitemapCrawlOptions, SitemapEntry, DeltaImportPlan } from "./sdk/sitemap";
export { parseAmount, cleanText, findFirstCurrencyAmount } from "./sdk/parsing";

export { ConnectorHealthService, buildConnectorHealthSummary } from "./services/ConnectorHealthService";
export type { ConnectorHealthSummary } from "./services/ConnectorHealthService";

export { SupabaseConnectorRepository } from "./infrastructure/SupabaseConnectorRepository";
export { SupabaseSyncRunRepository } from "./infrastructure/SupabaseSyncRunRepository";
export { SupabaseCatalogRepository } from "./infrastructure/SupabaseCatalogRepository";
export { SupabaseConnectorUrlSnapshotRepository } from "./infrastructure/SupabaseConnectorUrlSnapshotRepository";
export type { IConnectorRepository } from "./repositories/IConnectorRepository";
export type { ISyncRunRepository } from "./repositories/ISyncRunRepository";
export type { ICatalogRepository } from "./repositories/ICatalogRepository";
export type { IConnectorUrlSnapshotRepository, UrlSnapshotEntry } from "./repositories/IConnectorUrlSnapshotRepository";

export type { Connector } from "./domain/Connector";
export type { SyncRun } from "./domain/SyncRun";

export type { CertificationCriterionResult, CertificationReport, ConnectorQualityScore } from "./certification/types";
export type { ConnectorObservabilitySnapshot } from "./observability/types";
export type { ConnectorDirectoryEntry, ConnectorDirectoryDetail } from "./directory/types";
