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
  /** Release 1.8 — Program C — Market Intelligence Engine. Same shape as
   * `findByBrandId`, scoped by category instead — used to roll up Volatility
   * at the category level without a second query pattern. */
  findByCategoryId(categoryId: string): Promise<CanonicalProduct[]>;
  linkOffer(offerId: string, canonicalProductId: string): Promise<void>;
  findOffersByCanonicalProductId(
    canonicalProductId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<CanonicalOfferView>>;
  /** Release 1.8 — Program C — Market Intelligence Engine. The reverse
   * lookup of `findOffersByCanonicalProductId` — given a raw `products.id`
   * (the identifier `market_changes`/`VolatilityEngine` key on), find which
   * canonical product it's linked to, if any. `null` when the offer(s) for
   * this raw product haven't been linked yet (Product Identity, Shadow Mode). */
  findCanonicalProductIdByProductId(productId: string): Promise<string | null>;
  /** Release 1.9 — Program F — Wave 1 (Premium Home Experience). Unscoped
   * listing, used to rank Savings Opportunities across the whole catalog
   * (Home's "Economia do Dia"/"Ofertas Relâmpago") — the only caller that
   * needs every canonical product rather than one scoped by brand/category/id. */
  findAll(pagination: PaginationParams): Promise<PaginatedResult<CanonicalProduct>>;
}
