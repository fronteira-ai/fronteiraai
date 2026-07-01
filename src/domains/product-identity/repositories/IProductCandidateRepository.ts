import type { MatchCandidate } from "../types/product-identity.types";

// Product Identity is a Core Asset (RELEASE_1_7_BLUEPRINT.md Chapter 8) — it
// reads the catalog directly for candidate products, independent of
// connectors/ICatalogRepository (which exists for the ingestion/write path
// only). This keeps product-identity/ reusable by future consumers (search,
// compare, recommendations) without a dependency on the connectors domain.
export interface IProductCandidateRepository {
  findByBrandSlug(brandSlug: string): Promise<MatchCandidate[]>;
}
