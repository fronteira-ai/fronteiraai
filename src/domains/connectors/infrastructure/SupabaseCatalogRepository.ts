import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ICatalogRepository,
  ExistingOfferLookup,
  UpsertProductInput,
  UpdateOfferInput,
  UpsertOfferInput,
  InsertPriceHistoryInput,
} from "../repositories/ICatalogRepository";

// Unlike other Supabase*Repository classes in this codebase, these methods
// throw on error instead of returning null. This preserves the exact
// try/catch control flow CatalogWriteStage inherited from
// acquisition/persistence/catalog.writer.ts, where a failed upsert aborts
// that item's persistence and is recorded as a per-item error, not silently
// skipped.
export class SupabaseCatalogRepository implements ICatalogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findProductIdsBySlugs(slugs: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (slugs.length === 0) return map;

    const { data, error } = await this.client.from("products").select("id, slug").in("slug", slugs);
    if (error) {
      console.error("[SupabaseCatalogRepository.findProductIdsBySlugs]", error.message);
      return map;
    }
    for (const row of data ?? []) {
      map.set(row.slug as string, row.id as string);
    }
    return map;
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
    return data.id as string;
  }

  async upsertCategory(name: string, slug: string): Promise<string> {
    const { data, error } = await this.client
      .from("categories")
      .upsert({ name, slug, icon: null }, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) throw new Error(`category upsert: ${error.message}`);
    return data.id as string;
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
          available: input.inStock,
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
