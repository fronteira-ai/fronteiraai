import type { CanonicalProduct } from "../domain/CanonicalProduct";
import type {
  CanonicalOfferView,
  CanonicalProductInput,
  CanonicalProductSyncFields,
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
  /** Fase 2 — Sprint 2.8 (Canonical Catalog Synchronization). Updates only
   * the attributes that are allowed to drift back into sync with their
   * source `products` row (specifications, category_id, brand_id,
   * image_url) — never canonical_slug or name. Always stamps updated_at.
   * Callers are expected to only invoke this when a real diff was found
   * (CanonicalProductService.diffFromProduct) — it is not itself a diff. */
  updateSyncedFields(id: string, fields: Partial<CanonicalProductSyncFields>): Promise<CanonicalProduct>;
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
  /** Program Κ — Mission Κ-4 (Product Identity Integration). Batch id->slug
   * lookup against `categories` — the join `CanonicalProduct.categoryId`
   * (a UUID) needs before it can be resolved through the Universal Taxonomy
   * (`taxonomy.findNodeByRealCategorySlug`, which keys on the real slug,
   * never the id). Ids not found (deleted/orphaned category) are simply
   * absent from the returned map, never a fabricated entry. */
  findCategorySlugsByIds(categoryIds: string[]): Promise<Map<string, string>>;
  /** Release 1.9 — Program F — Wave 1 (Premium Home Experience). Unscoped
   * listing, used to rank Savings Opportunities across the whole catalog
   * (Home's "Economia do Dia"/"Ofertas Relâmpago") — the only caller that
   * needs every canonical product rather than one scoped by brand/category/id. */
  findAll(pagination: PaginationParams): Promise<PaginatedResult<CanonicalProduct>>;

  // Program Ω — Mission Ω-1 (Merge Execution Engine). Read-only — used only
  // to build a dry-run preview of which offers a merge would move, without
  // writing anything.
  findOfferIdsByCanonicalProductId(canonicalProductId: string): Promise<string[]>;
  /** Atomically repoints every offer currently on `sourceCanonicalProductId`
   * to `targetCanonicalProductId` and returns the moved offer ids — a
   * single UPDATE ... RETURNING, so the returned list is exactly what moved
   * in this call, safe to hand straight to a MergeExecution audit row. */
  reassignOffers(sourceCanonicalProductId: string, targetCanonicalProductId: string): Promise<string[]>;
  /** Rollback-only: repoints exactly the given offer ids (never "every
   * offer currently on X", which could include offers moved by a later,
   * unrelated merge into the same target). */
  reassignOffersByIds(offerIds: string[], targetCanonicalProductId: string): Promise<void>;
  /** Marks a canonical product as merged into another. Never deletes the
   * row — reversible via `reactivate`. */
  deactivateAndMerge(id: string, mergedIntoId: string): Promise<void>;
  /** Reverses `deactivateAndMerge`. Used only by MergeExecutorService.rollback. */
  reactivate(id: string): Promise<void>;
}
