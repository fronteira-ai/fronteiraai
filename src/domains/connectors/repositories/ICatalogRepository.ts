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

export interface ICatalogRepository {
  findProductIdsBySlugs(slugs: string[]): Promise<Map<string, string>>;
  findStoreIdBySlug(slug: string): Promise<string | null>;
  findOfferByProductAndStore(productId: string, storeId: string): Promise<ExistingOfferLookup | null>;
  upsertBrand(name: string, slug: string): Promise<string>;
  upsertCategory(name: string, slug: string): Promise<string>;
  upsertProduct(input: UpsertProductInput): Promise<string>;
  updateOffer(offerId: string, input: UpdateOfferInput): Promise<void>;
  upsertOffer(input: UpsertOfferInput): Promise<string>;
  insertPriceHistory(input: InsertPriceHistoryInput): Promise<void>;
}
