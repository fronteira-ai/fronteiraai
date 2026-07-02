import type { CanonicalProduct } from "../domain/CanonicalProduct";
import type {
  CanonicalOfferView,
  CanonicalProductInput,
  PaginatedResult,
  PaginationParams,
} from "../types/canonical-catalog.types";

export interface ICanonicalCatalogRepository {
  findBySlug(canonicalSlug: string): Promise<CanonicalProduct | null>;
  findById(id: string): Promise<CanonicalProduct | null>;
  /**
   * Idempotent by canonical_slug — returns the existing row if one already
   * has this slug, otherwise creates it. canonical_slug is immutable once a
   * row exists; this method never updates an existing row's slug.
   */
  findOrCreateBySlug(canonicalSlug: string, input: CanonicalProductInput): Promise<CanonicalProduct>;
  /** Candidate pool for merge suggestions — same brand-scoping used by product-identity's own candidate search. */
  findByBrandId(brandId: string): Promise<CanonicalProduct[]>;
  linkOffer(offerId: string, canonicalProductId: string): Promise<void>;
  findOffersByCanonicalProductId(
    canonicalProductId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<CanonicalOfferView>>;
}
