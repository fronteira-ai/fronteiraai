// Program Ω — Implementation Phase, Mission Ω-1 (Marketplace Memory
// Foundation). Persists the output of already-existing, unmodified pure
// functions (product-intelligence/buildProductSignature, taxonomy's
// Universal Category resolution, Κ-2's normalizeBrandName) so they stop
// being recomputed on every sync — the 624.2x redundancy measured in
// docs/architecture/MARKETPLACE_LEARNING_ENGINE.md (Mission Ξ-2).
//
// This domain is deliberately NOT wired into CanonicalMergeSuggestionService,
// ProductIdentityEngine, or any Merge/Opportunity/Buyer Intelligence/Search
// consumer — this Mission builds the Foundation only. Wiring is a future
// Mission's decision, same discipline already proven by taxonomy/ and
// product-intelligence/ (Κ-2/Κ-3, both built one Mission, wired a
// different one, Κ-4).

export * from "./types/enums";
export * from "./types/marketplace-memory.types";
export type { LearnedFact } from "./domain/LearnedFact";
export type { MerchantAttributePattern } from "./domain/MerchantAttributePattern";
export type { ILearnedFactRepository } from "./repositories/ILearnedFactRepository";
export type { IMerchantAttributePatternRepository } from "./repositories/IMerchantAttributePatternRepository";
export { SupabaseLearnedFactRepository } from "./infrastructure/SupabaseLearnedFactRepository";
export { SupabaseMerchantAttributePatternRepository } from "./infrastructure/SupabaseMerchantAttributePatternRepository";
export { LearnedFactMapper } from "./mappers/LearnedFactMapper";
export { MerchantAttributePatternMapper } from "./mappers/MerchantAttributePatternMapper";
export { factsFromProductSignature, factCategoryFromTaxonomy, factBrandFromNormalization } from "./factories/LearnedFactFactory";
export { MarketplaceMemoryService } from "./services/MarketplaceMemoryService";
export type { MarketplaceMemoryEvent, KnowledgeLearnedEvent, MerchantLearnedEvent } from "./events/marketplace-memory.events";
