// Replaces the raw SupabaseClient that acquisition/types/pipeline.ts's
// PipelineContext carried directly into stage logic. Every method here is a
// behavior-preserving port of the inline Supabase calls that used to live in
// acquisition/engines/deduplication.engine.ts and acquisition/persistence/catalog.writer.ts.

export interface ExistingOfferLookup {
  offerId: string;
  priceUSD: number;
  inStock: boolean;
  stockQuantity: number | null;
  description: string | null;
  imageUrl: string | null;
}

export interface UpsertProductInput {
  name: string;
  slug: string;
  description: string;
  brandId: string;
  categoryId: string;
  imageUrl: string | null;
  specifications: Record<string, string> | null;
}

export interface UpdateOfferInput {
  priceUSD: number;
  priceBRL: number | null;
  inStock: boolean;
  stockQuantity: number | null;
  condition: string | null;
  warranty: string | null;
  cashback: number | null;
  productUrl: string | null;
}

export interface UpsertOfferInput {
  productId: string;
  storeId: string;
  currency: string;
  priceUSD: number;
  priceBRL: number | null;
  oldPriceUSD: number | null;
  inStock: boolean;
  stockQuantity: number | null;
  condition: string | null;
  warranty: string | null;
  cashback: number | null;
  productUrl: string | null;
}

export interface InsertPriceHistoryInput {
  offerId: string;
  priceUSD: number;
  priceBRL: number | null;
  source: string;
}

export interface CatalogEntry {
  id: string;
  name: string;
}

export interface RecordProductIdentifierInput {
  productId: string;
  identifierType: "ean" | "manufacturer_code";
  identifierValue: string;
  brandId: string;
}

export interface CreatePendingReviewInput {
  productId: string | null;
  storeId: string;
  fieldType: "brand" | "category";
  rawValue: string;
  reasons: string[];
  /** The full NormalizedOffer this review blocked — enough to complete the
   * write later without re-fetching the source page. */
  payload: unknown;
}

export interface PendingReviewRecord {
  id: string;
  productId: string | null;
  storeId: string;
  fieldType: "brand" | "category";
  rawValue: string;
  reasons: string[];
  payload: unknown;
  status: "pending" | "resolved";
  createdAt: string;
}

export interface ResolvePendingReviewInput {
  resolvedValue: string;
  resolvedBrandId: string | null;
  resolvedCategoryId: string | null;
  resolvedBy: string | null;
}

export interface ResolvedProduct {
  id: string;
  slug: string;
  name: string;
  brandId: string | null;
  categoryId: string | null;
  imageUrl: string | null;
  specifications: Record<string, string> | null;
}

export interface ICatalogRepository {
  findProductIdsBySlugs(slugs: string[]): Promise<Map<string, string>>;
  /** Mission Ω-Canonical Integration. Reads back the just-written product
   * row (already resolved by the Gatekeeper — real brand_id/category_id,
   * never raw connector text) — the same data
   * canonical-catalog-bootstrap.ts already reads fresh from `products`,
   * now read by CanonicalLinkStage instead of a second Gatekeeper pass. */
  findProductById(productId: string): Promise<ResolvedProduct | null>;
  /** Mission Ω-Hardening (HistoricalCanonicalBootstrapService). Keyset
   * pagination ordered by id — never OFFSET-based, same precedent as
   * IRecoveryRepository.fetchCandidates (an OFFSET scan hit Postgres's
   * statement timeout around row #20,000 in production; a keyset WHERE
   * id > cursor seeks directly via the primary key index regardless of
   * how deep into the catalog a page is). `afterProductId: null` starts
   * from the beginning. */
  findProductsAfterId(afterProductId: string | null, limit: number): Promise<ResolvedProduct[]>;
  /** Mission Ω-Hardening. All offer ids for one product — the historical
   * bootstrap's equivalent of what CatalogWriteStage already knows
   * per-item from its own write (a single offerId); a backlog item has no
   * such context, so it looks this up. */
  findOfferIdsByProductId(productId: string): Promise<string[]>;
  findStoreIdBySlug(slug: string): Promise<string | null>;
  findOfferByProductAndStore(productId: string, storeId: string): Promise<ExistingOfferLookup | null>;
  upsertBrand(name: string, slug: string): Promise<string>;
  upsertCategory(name: string, slug: string): Promise<string>;
  upsertProduct(input: UpsertProductInput): Promise<string>;
  updateOffer(offerId: string, input: UpdateOfferInput): Promise<void>;
  upsertOffer(input: UpsertOfferInput): Promise<string>;
  insertPriceHistory(input: InsertPriceHistoryInput): Promise<void>;

  // Mission Ω-Gatekeeper (Catalog Integrity Firewall).
  /** An existing brand whose OWN name, run through the same normalization,
   * equals `normalizedName` — never a raw-string lookup. */
  findBrandByNormalizedName(normalizedName: string): Promise<CatalogEntry | null>;
  /** An existing category already resolved to the same Universal Taxonomy
   * node — `taxonomySlug` is the caller's already-resolved gate slug. */
  findCategoryByNormalizedName(taxonomySlug: string): Promise<CatalogEntry | null>;
  /** Camada 1 — the confirmed (real, non-forbidden) brand of any OTHER
   * product already carrying this exact EAN/manufacturer code. */
  findBrandIdByIdentifier(identifierType: "ean" | "manufacturer_code", identifierValue: string): Promise<CatalogEntry | null>;
  /** Records a confirmed identifier for future cross-referencing —
   * best-effort: never blocks the write path this Mission protects. */
  recordProductIdentifier(input: RecordProductIdentifierInput): Promise<void>;
  /** Persists a case the Firewall could not confirm deterministically —
   * never a silent fallback to a forbidden placeholder value. */
  createPendingReview(input: CreatePendingReviewInput): Promise<void>;
  /** Every still-pending review for the exact same (store, field, raw
   * value) — resolving one occurrence resolves every other queued
   * occurrence of the identical pattern in the same pass. */
  findPendingReviewsByStoreFieldValue(storeId: string, fieldType: "brand" | "category", rawValue: string): Promise<PendingReviewRecord[]>;
  resolvePendingReview(reviewId: string, input: ResolvePendingReviewInput): Promise<void>;
}
