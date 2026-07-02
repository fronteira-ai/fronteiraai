// Public API of the Product Identity domain — Core Asset (RELEASE_1_7_BLUEPRINT.md
// Chapter 8). Any future need to compare products across stores (search,
// compare, recommendations) must depend on this domain, never reimplement
// its own "is this the same product" heuristic.

export * from "./types/enums";
export * from "./types/product-identity.types";

export { ProductIdentityEngine } from "./domain/ProductIdentityEngine";
export { ProductIdentityService } from "./services/ProductIdentityService";
export { CanonicalMergeSuggestionService } from "./services/CanonicalMergeSuggestionService";

export type { IProductCandidateRepository } from "./repositories/IProductCandidateRepository";
export type { IProductIdentityMatchLogRepository, MatchLogEntry } from "./repositories/IProductIdentityMatchLogRepository";
export { SupabaseProductCandidateRepository } from "./infrastructure/SupabaseProductCandidateRepository";
export { SupabaseProductIdentityMatchLogRepository } from "./infrastructure/SupabaseProductIdentityMatchLogRepository";
