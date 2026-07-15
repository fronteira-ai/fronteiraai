// Public API of the Canonical Catalog domain — the permanent product
// identity layer (RELEASE_1_7_BLUEPRINT.md, Wave 4). Foundation domain:
// depends on nothing else in src/domains/ (never connectors/, never
// product-identity/) so every other domain — including product-identity/,
// which depends down into this one for merge suggestions — can depend on
// it freely.

export * from "./types/enums";
export * from "./types/canonical-catalog.types";

export type { CanonicalProduct } from "./domain/CanonicalProduct";
export type { MergeCandidate, MergeCandidatePenalty } from "./domain/MergeCandidate";
export type { MergeExecution } from "./domain/MergeExecution";

export type { ICanonicalCatalogRepository } from "./repositories/ICanonicalCatalogRepository";
export type { IMergeCandidateRepository, CreateMergeCandidateInput } from "./repositories/IMergeCandidateRepository";
export type { IMergeExecutionRepository, CreateMergeExecutionInput } from "./repositories/IMergeExecutionRepository";
export type {
  ICanonicalPriceHistoryRepository,
  CanonicalPriceHistoryPoint,
} from "./repositories/ICanonicalPriceHistoryRepository";

export { SupabaseCanonicalCatalogRepository } from "./infrastructure/SupabaseCanonicalCatalogRepository";
export { SupabaseMergeCandidateRepository } from "./infrastructure/SupabaseMergeCandidateRepository";
export { SupabaseMergeExecutionRepository } from "./infrastructure/SupabaseMergeExecutionRepository";
export { SupabaseCanonicalPriceHistoryRepository } from "./infrastructure/SupabaseCanonicalPriceHistoryRepository";

export { CanonicalProductService } from "./services/CanonicalProductService";
export type { BootstrapProductInput, CanonicalDrift } from "./services/CanonicalProductService";
export { OfferRankingService } from "./services/OfferRankingService";
export type { OfferRankInput, OfferRankFactor, RankedCanonicalOffer } from "./services/OfferRankingService";
export { CanonicalPriceHistoryService, computePriceAggregation } from "./services/CanonicalPriceHistoryService";
export type { CanonicalPriceAggregation, PriceTrend } from "./services/CanonicalPriceHistoryService";
export { CompareFoundationService } from "./services/CompareFoundationService";
export type { CompareFoundationResult } from "./services/CompareFoundationService";
export { MergeAuditService, classifyMergeConfidence, MERGE_AUDIT_ALTA_THRESHOLD, MERGE_AUDIT_MEDIA_THRESHOLD } from "./services/MergeAuditService";
export type { MergeCandidateAudit, MergeConfidenceClassification } from "./services/MergeAuditService";
export { MergeExecutorService } from "./services/MergeExecutorService";
export type {
  MergeError,
  MergeErrorCode,
  MergePreview,
  ReviewResult,
  PreviewResult,
  ExecuteResult,
  RollbackResult,
  BatchExecuteResult,
} from "./services/MergeExecutorService";
export { MergeQueueDashboardService } from "./services/MergeQueueDashboardService";
export type { MergeQueueStats } from "./services/MergeQueueDashboardService";
