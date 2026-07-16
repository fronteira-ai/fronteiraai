import type { SupabaseClient } from "@supabase/supabase-js";
import type { CanonicalProduct } from "../domain/CanonicalProduct";
import type { ICanonicalCatalogRepository } from "../repositories/ICanonicalCatalogRepository";
import type {
  CanonicalOfferView,
  CanonicalProductInput,
  CanonicalProductSyncFields,
  PaginatedResult,
  PaginationParams,
} from "../types/canonical-catalog.types";

function toCanonicalProduct(row: Record<string, unknown>): CanonicalProduct {
  return {
    id: row.id as string,
    canonicalSlug: row.canonical_slug as string,
    name: row.name as string,
    brandId: (row.brand_id as string | null) ?? null,
    categoryId: (row.category_id as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    specifications: (row.specifications as Record<string, string> | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    isActive: (row.is_active as boolean | null) ?? true,
    mergedIntoId: (row.merged_into_id as string | null) ?? null,
  };
}

export class SupabaseCanonicalCatalogRepository implements ICanonicalCatalogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findBySlug(canonicalSlug: string): Promise<CanonicalProduct | null> {
    const { data, error } = await this.client
      .from("canonical_products")
      .select("*")
      .eq("canonical_slug", canonicalSlug)
      .maybeSingle();
    if (error) {
      console.error("[SupabaseCanonicalCatalogRepository.findBySlug]", error.message);
      return null;
    }
    return data ? toCanonicalProduct(data) : null;
  }

  async findById(id: string): Promise<CanonicalProduct | null> {
    const { data, error } = await this.client.from("canonical_products").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("[SupabaseCanonicalCatalogRepository.findById]", error.message);
      return null;
    }
    return data ? toCanonicalProduct(data) : null;
  }

  async findOrCreateBySlug(canonicalSlug: string, input: CanonicalProductInput): Promise<CanonicalProduct> {
    const existing = await this.findBySlug(canonicalSlug);
    if (existing) return existing;

    const { data, error } = await this.client
      .from("canonical_products")
      .insert({
        canonical_slug: canonicalSlug,
        name: input.name,
        brand_id: input.brandId,
        category_id: input.categoryId,
        image_url: input.imageUrl,
        specifications: input.specifications,
      })
      .select("*")
      .single();

    if (error) {
      // Concurrent creation race: another caller inserted the same slug
      // between our findBySlug and insert. Read-back instead of failing —
      // canonical_slug's UNIQUE constraint is what actually prevents
      // duplicates; this makes the method idempotent under concurrency too.
      const raced = await this.findBySlug(canonicalSlug);
      if (raced) return raced;
      throw new Error(`canonical product insert: ${error.message}`);
    }

    return toCanonicalProduct(data);
  }

  async updateSyncedFields(id: string, fields: Partial<CanonicalProductSyncFields>): Promise<CanonicalProduct> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ("brandId" in fields) patch.brand_id = fields.brandId;
    if ("categoryId" in fields) patch.category_id = fields.categoryId;
    if ("imageUrl" in fields) patch.image_url = fields.imageUrl;
    if ("specifications" in fields) patch.specifications = fields.specifications;

    const { data, error } = await this.client.from("canonical_products").update(patch).eq("id", id).select("*").single();
    if (error) throw new Error(`canonical product sync update: ${error.message}`);
    return toCanonicalProduct(data);
  }

  async findByBrandId(brandId: string): Promise<CanonicalProduct[]> {
    const { data, error } = await this.client.from("canonical_products").select("*").eq("brand_id", brandId);
    if (error) {
      console.error("[SupabaseCanonicalCatalogRepository.findByBrandId]", error.message);
      return [];
    }
    return (data ?? []).map(toCanonicalProduct);
  }

  async findByCategoryId(categoryId: string): Promise<CanonicalProduct[]> {
    const { data, error } = await this.client.from("canonical_products").select("*").eq("category_id", categoryId);
    if (error) {
      console.error("[SupabaseCanonicalCatalogRepository.findByCategoryId]", error.message);
      return [];
    }
    return (data ?? []).map(toCanonicalProduct);
  }

  async linkOffer(offerId: string, canonicalProductId: string): Promise<void> {
    const { error } = await this.client
      .from("offers")
      .update({ canonical_product_id: canonicalProductId })
      .eq("id", offerId);
    if (error) throw new Error(`offer link: ${error.message}`);
  }

  async findOffersByCanonicalProductId(
    canonicalProductId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<CanonicalOfferView>> {
    const { limit, offset } = pagination;
    const { data, error, count } = await this.client
      .from("offers")
      .select("id, product_id, store_id, price_usd, in_stock, stock_quantity, updated_at, condition, warranty, product_url, stores(slug)", {
        count: "exact",
      })
      .eq("canonical_product_id", canonicalProductId)
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[SupabaseCanonicalCatalogRepository.findOffersByCanonicalProductId]", error.message);
      return { items: [], total: 0 };
    }

    const items: CanonicalOfferView[] = (data ?? []).map((row) => {
      const storeRelation = row.stores as { slug: string } | { slug: string }[] | null;
      const store = Array.isArray(storeRelation) ? storeRelation[0] : storeRelation;
      return {
        offerId: row.id as string,
        productId: row.product_id as string,
        storeId: row.store_id as string,
        storeSlug: store?.slug ?? "",
        priceUSD: row.price_usd as number,
        inStock: row.in_stock as boolean,
        stockQuantity: (row.stock_quantity as number | null) ?? null,
        updatedAt: row.updated_at as string,
        condition: (row.condition as string | null) ?? null,
        warranty: (row.warranty as string | null) ?? null,
        productUrl: (row.product_url as string | null) ?? null,
      };
    });

    return { items, total: count ?? items.length };
  }

  async findAll(pagination: PaginationParams): Promise<PaginatedResult<CanonicalProduct>> {
    const { limit, offset } = pagination;
    const { data, error, count } = await this.client
      .from("canonical_products")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[SupabaseCanonicalCatalogRepository.findAll]", error.message);
      return { items: [], total: 0 };
    }

    const items = (data ?? []).map(toCanonicalProduct);
    return { items, total: count ?? items.length };
  }

  async findCanonicalProductIdByProductId(productId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from("offers")
      .select("canonical_product_id")
      .eq("product_id", productId)
      .not("canonical_product_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[SupabaseCanonicalCatalogRepository.findCanonicalProductIdByProductId]", error.message);
      return null;
    }
    return (data?.canonical_product_id as string | null) ?? null;
  }

  // Program Ω — Mission Ω-1 (Merge Execution Engine)

  async findOfferIdsByCanonicalProductId(canonicalProductId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from("offers")
      .select("id")
      .eq("canonical_product_id", canonicalProductId);
    if (error) {
      console.error("[SupabaseCanonicalCatalogRepository.findOfferIdsByCanonicalProductId]", error.message);
      return [];
    }
    return (data ?? []).map((row) => row.id as string);
  }

  async reassignOffers(sourceCanonicalProductId: string, targetCanonicalProductId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from("offers")
      .update({ canonical_product_id: targetCanonicalProductId })
      .eq("canonical_product_id", sourceCanonicalProductId)
      .select("id");
    if (error) throw new Error(`merge offer reassignment: ${error.message}`);
    return (data ?? []).map((row) => row.id as string);
  }

  async reassignOffersByIds(offerIds: string[], targetCanonicalProductId: string): Promise<void> {
    if (offerIds.length === 0) return;
    const { error } = await this.client
      .from("offers")
      .update({ canonical_product_id: targetCanonicalProductId })
      .in("id", offerIds);
    if (error) throw new Error(`merge rollback offer reassignment: ${error.message}`);
  }

  async deactivateAndMerge(id: string, mergedIntoId: string): Promise<void> {
    const { error } = await this.client
      .from("canonical_products")
      .update({ is_active: false, merged_into_id: mergedIntoId, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`canonical product deactivate: ${error.message}`);
  }

  async reactivate(id: string): Promise<void> {
    const { error } = await this.client
      .from("canonical_products")
      .update({ is_active: true, merged_into_id: null, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`canonical product reactivate: ${error.message}`);
  }

  // Program Κ — Mission Κ-4 (Product Identity Integration)

  async findCategorySlugsByIds(categoryIds: string[]): Promise<Map<string, string>> {
    const uniqueIds = Array.from(new Set(categoryIds)).filter((id): id is string => Boolean(id));
    const result = new Map<string, string>();
    if (uniqueIds.length === 0) return result;

    // Chunked to stay well under Postgres/HTTP header limits for large
    // .in() filters (a 500-id chunk was already observed to overflow
    // request headers against this project — 100 stays comfortably under).
    const CHUNK = 100;
    for (let i = 0; i < uniqueIds.length; i += CHUNK) {
      const chunk = uniqueIds.slice(i, i + CHUNK);
      const { data, error } = await this.client.from("categories").select("id, slug").in("id", chunk);
      if (error) {
        console.error("[SupabaseCanonicalCatalogRepository.findCategorySlugsByIds]", error.message);
        continue;
      }
      for (const row of (data ?? []) as { id: string; slug: string }[]) {
        result.set(row.id, row.slug);
      }
    }
    return result;
  }
}
