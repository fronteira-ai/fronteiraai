import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ICatalogRepository,
  ExistingOfferLookup,
  UpsertProductInput,
  UpdateOfferInput,
  UpsertOfferInput,
  InsertPriceHistoryInput,
  CatalogEntry,
  RecordProductIdentifierInput,
  CreatePendingReviewInput,
  PendingReviewRecord,
  ResolvePendingReviewInput,
  ResolvedProduct,
} from "../repositories/ICatalogRepository";
import { slugify } from "@/utils/slug";

// Unlike other Supabase*Repository classes in this codebase, these methods
// throw on error instead of returning null. This preserves the exact
// try/catch control flow CatalogWriteStage inherited from
// acquisition/persistence/catalog.writer.ts, where a failed upsert aborts
// that item's persistence and is recorded as a per-item error, not silently
// skipped.
export class SupabaseCatalogRepository implements ICatalogRepository {
  // Mission Ω-Gatekeeper — in-memory caches for the lifetime of this
  // repository instance (one sync run: SyncOrchestrator constructs one
  // repository and reuses it across every batch). `brands`/`categories`
  // are small tables (hundreds of rows, not thousands) — fetching once and
  // keeping them updated as new rows are created this run avoids a full
  // table scan per offer while still seeing rows created earlier in the
  // SAME run (a plain one-shot fetch-at-construction cache would miss those).
  private brandsCache: CatalogEntry[] | null = null;
  private categoriesCache: CatalogEntry[] | null = null;

  constructor(private readonly client: SupabaseClient) {}

  private async loadBrandsCache(): Promise<CatalogEntry[]> {
    if (this.brandsCache) return this.brandsCache;
    const { data, error } = await this.client.from("brands").select("id, name");
    if (error) {
      console.error("[SupabaseCatalogRepository.loadBrandsCache]", error.message);
      return [];
    }
    this.brandsCache = (data ?? []).map((r) => ({ id: r.id as string, name: r.name as string }));
    return this.brandsCache;
  }

  private async loadCategoriesCache(): Promise<CatalogEntry[]> {
    if (this.categoriesCache) return this.categoriesCache;
    const { data, error } = await this.client.from("categories").select("id, name");
    if (error) {
      console.error("[SupabaseCatalogRepository.loadCategoriesCache]", error.message);
      return [];
    }
    this.categoriesCache = (data ?? []).map((r) => ({ id: r.id as string, name: r.name as string }));
    return this.categoriesCache;
  }

  async findProductIdsBySlugs(slugs: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (slugs.length === 0) return map;

    // Chunked `.in()` — PostgREST/Kong caps a query URI at ~8 KB; a batch of
    // hundreds of ~80-char slugs exceeds it (seen real: "URI too long" on a
    // 200-product New Zone batch → dedup failed → products/offers not
    // persisted). Chunks of 60 keep each query well under the cap without N+1.
    const CHUNK = 60;
    for (let i = 0; i < slugs.length; i += CHUNK) {
      const slice = slugs.slice(i, i + CHUNK);
      const { data, error } = await this.client.from("products").select("id, slug").in("slug", slice);
      if (error) {
        console.error("[SupabaseCatalogRepository.findProductIdsBySlugs]", error.message);
        continue;
      }
      for (const row of data ?? []) {
        map.set(row.slug as string, row.id as string);
      }
    }
    return map;
  }

  async findProductById(productId: string): Promise<ResolvedProduct | null> {
    const { data, error } = await this.client
      .from("products")
      .select("id, slug, name, brand_id, category_id, image_url, specifications")
      .eq("id", productId)
      .maybeSingle();
    if (error) {
      console.error("[SupabaseCatalogRepository.findProductById]", error.message);
      return null;
    }
    if (!data) return null;
    return {
      id: data.id as string,
      slug: data.slug as string,
      name: data.name as string,
      brandId: (data.brand_id as string | null) ?? null,
      categoryId: (data.category_id as string | null) ?? null,
      imageUrl: (data.image_url as string | null) ?? null,
      specifications: (data.specifications as Record<string, string> | null) ?? null,
    };
  }

  async findProductsAfterId(afterProductId: string | null, limit: number): Promise<ResolvedProduct[]> {
    let query = this.client
      .from("products")
      .select("id, slug, name, brand_id, category_id, image_url, specifications")
      .order("id", { ascending: true })
      .limit(limit);
    if (afterProductId) query = query.gt("id", afterProductId);

    const { data, error } = await query;
    if (error) {
      console.error("[SupabaseCatalogRepository.findProductsAfterId]", error.message);
      return [];
    }
    return (data ?? []).map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      brandId: (row.brand_id as string | null) ?? null,
      categoryId: (row.category_id as string | null) ?? null,
      imageUrl: (row.image_url as string | null) ?? null,
      specifications: (row.specifications as Record<string, string> | null) ?? null,
    }));
  }

  async findOfferIdsByProductId(productId: string): Promise<string[]> {
    const { data, error } = await this.client.from("offers").select("id").eq("product_id", productId);
    if (error) {
      console.error("[SupabaseCatalogRepository.findOfferIdsByProductId]", error.message);
      return [];
    }
    return (data ?? []).map((row) => row.id as string);
  }

  async findStoreIdBySlug(slug: string): Promise<string | null> {
    const { data, error } = await this.client.from("stores").select("id").eq("slug", slug).maybeSingle();
    if (error) {
      console.error("[SupabaseCatalogRepository.findStoreIdBySlug]", error.message);
      return null;
    }
    return (data?.id as string) ?? null;
  }

  async findOfferByProductAndStore(productId: string, storeId: string): Promise<ExistingOfferLookup | null> {
    const { data, error } = await this.client
      .from("offers")
      .select("id, price_usd, in_stock, stock_quantity, products(description, image_url)")
      .eq("product_id", productId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (error) {
      console.error("[SupabaseCatalogRepository.findOfferByProductAndStore]", error.message);
      return null;
    }
    if (!data) return null;

    const productRelation = data.products as { description: string | null; image_url: string | null } | { description: string | null; image_url: string | null }[] | null;
    const product = Array.isArray(productRelation) ? productRelation[0] : productRelation;

    return {
      offerId: data.id as string,
      priceUSD: data.price_usd as number,
      inStock: data.in_stock as boolean,
      stockQuantity: (data.stock_quantity as number | null) ?? null,
      description: product?.description ?? null,
      imageUrl: product?.image_url ?? null,
    };
  }

  async upsertBrand(name: string, slug: string): Promise<string> {
    const { data, error } = await this.client
      .from("brands")
      .upsert({ name, slug, logo_url: null }, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) throw new Error(`brand upsert: ${error.message}`);
    const id = data.id as string;
    if (this.brandsCache && !this.brandsCache.some((b) => b.id === id)) {
      this.brandsCache.push({ id, name });
    }
    return id;
  }

  async upsertCategory(name: string, slug: string): Promise<string> {
    const { data, error } = await this.client
      .from("categories")
      .upsert({ name, slug, icon: null }, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) throw new Error(`category upsert: ${error.message}`);
    const id = data.id as string;
    if (this.categoriesCache && !this.categoriesCache.some((c) => c.id === id)) {
      this.categoriesCache.push({ id, name });
    }
    return id;
  }

  // Mission Ω-Gatekeeper (Catalog Integrity Firewall).

  async findBrandByNormalizedName(normalizedName: string): Promise<CatalogEntry | null> {
    const { normalizeBrandName } = await import("@/src/domains/taxonomy");
    const brands = await this.loadBrandsCache();
    return brands.find((b) => normalizeBrandName(b.name) === normalizedName) ?? null;
  }

  async findCategoryByNormalizedName(taxonomySlug: string): Promise<CatalogEntry | null> {
    const { findNodeByRealCategorySlug } = await import("@/src/domains/taxonomy");
    const categories = await this.loadCategoriesCache();
    return (
      categories.find((c) => {
        const ownSlug = slugify(c.name);
        const node = findNodeByRealCategorySlug(ownSlug);
        return (node?.slug ?? ownSlug) === taxonomySlug;
      }) ?? null
    );
  }

  async findBrandIdByIdentifier(identifierType: "ean" | "manufacturer_code", identifierValue: string): Promise<CatalogEntry | null> {
    const { data, error } = await this.client
      .from("product_identifiers")
      .select("brand_id, brands(id, name)")
      .eq("identifier_type", identifierType)
      .eq("identifier_value", identifierValue)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("[SupabaseCatalogRepository.findBrandIdByIdentifier]", error.message);
      return null;
    }
    if (!data) return null;
    const brandRelation = data.brands as { id: string; name: string } | { id: string; name: string }[] | null;
    const brand = Array.isArray(brandRelation) ? brandRelation[0] : brandRelation;
    return brand ? { id: brand.id, name: brand.name } : null;
  }

  async recordProductIdentifier(input: RecordProductIdentifierInput): Promise<void> {
    const { error } = await this.client
      .from("product_identifiers")
      .upsert(
        {
          product_id: input.productId,
          identifier_type: input.identifierType,
          identifier_value: input.identifierValue,
          brand_id: input.brandId,
        },
        { onConflict: "product_id,identifier_type" }
      );
    if (error) {
      // Best-effort — this is a cross-reference index, never the primary
      // write path this Mission protects. A failure here never blocks the
      // product/offer write that already succeeded.
      console.error("[SupabaseCatalogRepository.recordProductIdentifier]", error.message);
    }
  }

  async createPendingReview(input: CreatePendingReviewInput): Promise<void> {
    const { error } = await this.client.from("catalog_pending_reviews").insert({
      product_id: input.productId,
      store_id: input.storeId,
      field_type: input.fieldType,
      raw_value: input.rawValue,
      reasons: input.reasons,
      payload: input.payload,
    });
    if (error) {
      console.error("[SupabaseCatalogRepository.createPendingReview]", error.message);
    }
  }

  async findPendingReviewsByStoreFieldValue(
    storeId: string,
    fieldType: "brand" | "category",
    rawValue: string
  ): Promise<PendingReviewRecord[]> {
    const { data, error } = await this.client
      .from("catalog_pending_reviews")
      .select("*")
      .eq("store_id", storeId)
      .eq("field_type", fieldType)
      .eq("raw_value", rawValue)
      .eq("status", "pending");
    if (error) {
      console.error("[SupabaseCatalogRepository.findPendingReviewsByStoreFieldValue]", error.message);
      return [];
    }
    return (data ?? []).map((row) => ({
      id: row.id as string,
      productId: row.product_id as string | null,
      storeId: row.store_id as string,
      fieldType: row.field_type as "brand" | "category",
      rawValue: row.raw_value as string,
      reasons: (row.reasons as string[] | null) ?? [],
      payload: row.payload,
      status: row.status as "pending" | "resolved",
      createdAt: row.created_at as string,
    }));
  }

  async resolvePendingReview(reviewId: string, input: ResolvePendingReviewInput): Promise<void> {
    const { error } = await this.client
      .from("catalog_pending_reviews")
      .update({
        status: "resolved",
        resolved_value: input.resolvedValue,
        resolved_brand_id: input.resolvedBrandId,
        resolved_category_id: input.resolvedCategoryId,
        resolved_by: input.resolvedBy,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reviewId);
    if (error) throw new Error(`pending review resolve: ${error.message}`);
  }

  async upsertProduct(input: UpsertProductInput): Promise<string> {
    const { data, error } = await this.client
      .from("products")
      .upsert(
        {
          name: input.name,
          slug: input.slug,
          description: input.description,
          brand_id: input.brandId,
          category_id: input.categoryId,
          image_url: input.imageUrl,
          specifications: input.specifications,
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();
    if (error) throw new Error(`product upsert: ${error.message}`);
    return data.id as string;
  }

  async updateOffer(offerId: string, input: UpdateOfferInput): Promise<void> {
    const { error } = await this.client
      .from("offers")
      .update({
        price_usd: input.priceUSD,
        price_brl: input.priceBRL,
        // old_price is intentionally NOT set here — this mirrors a quirk
        // preserved from acquisition/persistence/catalog.writer.ts, where the
        // update path never wrote old_price (its guard condition was always
        // false in practice). Not fixed in Epic 1 — see RELEASE_1_7_EXECUTION_PLAN.md.
        in_stock: input.inStock,
        stock_quantity: input.stockQuantity,
        condition: input.condition,
        warranty: input.warranty,
        cashback: input.cashback,
        product_url: input.productUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", offerId);
    if (error) throw new Error(`offer update: ${error.message}`);
  }

  async upsertOffer(input: UpsertOfferInput): Promise<string> {
    const { data, error } = await this.client
      .from("offers")
      .upsert(
        {
          product_id: input.productId,
          store_id: input.storeId,
          currency: input.currency,
          price_usd: input.priceUSD,
          price_brl: input.priceBRL,
          old_price: input.oldPriceUSD,
          in_stock: input.inStock,
          // available é SEMÂNTICA de arquivo (ADR-008): o pipeline do conector
          // NÃO emite sinal de "arquivada". `available` NÃO deve derivar de
          // in_stock — out-of-stock é `in_stock=false` com `available=true`
          // (esgotada, visível "Sem estoque", histórico intacto). Derivar
          // available de inStock escondia ofertas válidas do /product/[slug].
          available: true,
          stock_quantity: input.stockQuantity,
          condition: input.condition,
          warranty: input.warranty,
          cashback: input.cashback,
          product_url: input.productUrl,
        },
        { onConflict: "product_id,store_id" }
      )
      .select("id")
      .single();
    if (error) throw new Error(`offer upsert: ${error.message}`);
    return data.id as string;
  }

  async insertPriceHistory(input: InsertPriceHistoryInput): Promise<void> {
    const { error } = await this.client.from("price_history").insert({
      offer_id: input.offerId,
      price_usd: input.priceUSD,
      price_brl: input.priceBRL,
      source: input.source,
    });
    if (error) console.error("[SupabaseCatalogRepository.insertPriceHistory]", error.message);
  }
}
