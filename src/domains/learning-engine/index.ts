// Program Ω — Mission Ω-5 (Continuous Knowledge Engine). The Learning
// Engine that MarketplaceMemoryService's own docstring named "a future
// Mission" and that docs/architecture/MARKETPLACE_LEARNING_ENGINE.md,
// LEARNING_LIFECYCLE.md, CONFIDENCE_ENGINE.md, PATTERN_LEARNING.md and
// KNOWLEDGE_PROPAGATION.md (Mission Ξ-2) already specified but left as pure
// architecture ("zero código, zero migration").
//
// This Mission adds real code, one new additive migration, and real
// versioned/append-only storage on top of it — but it deliberately does
// NOT modify CatalogWriteStage, BrandCategoryGatekeeper,
// PendingReviewResolutionService, CatalogRecoveryEngine, or any connector
// (explicit compatibility constraint: "Não alterar Sync Pipeline, Product
// Identity, Merge Engine, Offer Ranking, Catalog Recovery, Firewall,
// Conectores"). Reuse going forward (a live consumer reading this ledger
// before a Firewall decision) is a future Mission's wiring decision, same
// precedent as Marketplace Memory Foundation (Ω-1) itself — proven here by
// replay/simulation against real data
// (scripts/knowledge-engine-validation-report.ts), never by editing a
// forbidden file.

export * from "./types/enums";
export * from "./types/knowledge-engine.types";
export type { KnowledgeRecord } from "./domain/KnowledgeRecord";
export { classifyTier, computeConfidence, hasChanged, isConflict, knowledgeKeyFor, nextVersion } from "./domain/ConfidenceEngine";
export type { IKnowledgeRepository } from "./repositories/IKnowledgeRepository";
export { SupabaseKnowledgeRepository } from "./infrastructure/SupabaseKnowledgeRepository";
export { KnowledgeRecordMapper } from "./mappers/KnowledgeRecordMapper";
export { KnowledgeIngestionService } from "./services/KnowledgeIngestionService";
export { GlobalPromotionEngine } from "./services/GlobalPromotionEngine";
export { buildKnowledgeReport, countPendingReviewsAlreadyKnown, ASSUMED_MINUTES_PER_MANUAL_REVIEW } from "./services/KnowledgeObservabilityService";
export type { KnowledgeReport, ResolvedReviewGroupKey } from "./services/KnowledgeObservabilityService";
