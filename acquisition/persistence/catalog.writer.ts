import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DeduplicatedOffer,
  PersistenceResult,
  IPipelineStage,
  PipelineContext,
} from "../types/pipeline";
import { recordStage, recordError } from "../observability/metrics";

export class CatalogWriter implements IPipelineStage {
  readonly name = "persistence";

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    if (ctx.dryRun) {
      ctx.persisted = ctx.deduplicated.map((d) => ({
        productSlug: d.normalized.product.slug,
        storeSlug: d.normalized.offer.storeSlug,
        action: "skipped" as const,
      }));
      ctx.metrics.totals.skipped += ctx.deduplicated.length;
      recordStage(ctx, this.name, new Date().toISOString(), 0, 0, ctx.deduplicated.length);
      return ctx;
    }

    const startedAt = new Date().toISOString();
    const results: PersistenceResult[] = [];
    let persisted = 0;
    let skipped = 0;
    let failed = 0;

    for (const item of ctx.deduplicated) {
      if (item.status === "skip") {
        results.push({
          productSlug: item.normalized.product.slug,
          storeSlug: item.normalized.offer.storeSlug,
          action: "skipped",
          existingOfferId: item.existingOfferId,
        } as PersistenceResult & { existingOfferId?: string });
        skipped++;
        continue;
      }

      try {
        const result = await this.persist(ctx.supabase, item);
        results.push(result);
        if (result.action === "error") failed++;
        else persisted++;
      } catch (err) {
        failed++;
        recordError(ctx, this.name, String(err), item.normalized.product.slug);
        results.push({
          productSlug: item.normalized.product.slug,
          storeSlug: item.normalized.offer.storeSlug,
          action: "error",
          error: String(err),
        });
      }
    }

    ctx.persisted = results;
    ctx.metrics.totals.persisted = persisted;
    ctx.metrics.totals.skipped += skipped;
    ctx.metrics.totals.failed += failed;
    recordStage(ctx, this.name, startedAt, persisted, failed, skipped);
    return ctx;
  }

  private async persist(
    supabase: SupabaseClient,
    item: DeduplicatedOffer
  ): Promise<PersistenceResult> {
    const { normalized, status, existingProductId, existingOfferId } = item;
    const { product: p, offer: o } = normalized;

    // 1. Upsert brand.
    const { data: brandData, error: brandErr } = await supabase
      .from("brands")
      .upsert({ name: p.brandName, slug: p.brandSlug, logo_url: null }, { onConflict: "slug" })
      .select("id")
      .single();
    if (brandErr) throw new Error(`brand upsert: ${brandErr.message}`);
    const brandId = brandData.id as string;

    // 2. Upsert category.
    const { data: catData, error: catErr } = await supabase
      .from("categories")
      .upsert({ name: p.categoryName, slug: p.categorySlug, icon: null }, { onConflict: "slug" })
      .select("id")
      .single();
    if (catErr) throw new Error(`category upsert: ${catErr.message}`);
    const categoryId = catData.id as string;

    // 3. Upsert store (must already exist — we don't create stores automatically).
    const { data: storeData, error: storeErr } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", o.storeSlug)
      .maybeSingle();
    if (storeErr) throw new Error(`store lookup: ${storeErr.message}`);
    if (!storeData) throw new Error(`store not found: ${o.storeSlug}`);
    const storeId = storeData.id as string;

    // 4. Upsert product.
    const imageUrl = normalized.resolvedImageUrl ?? p.imageUrl;
    const { data: productData, error: productErr } = await supabase
      .from("products")
      .upsert(
        {
          name: p.name,
          slug: p.slug,
          description: p.description,
          brand_id: brandId,
          category_id: categoryId,
          image_url: imageUrl,
          specifications: Object.keys(p.specifications).length > 0 ? p.specifications : null,
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();
    if (productErr) throw new Error(`product upsert: ${productErr.message}`);
    const productId = productData.id as string;

    // 5. Upsert offer.
    if (status === "update" && existingOfferId) {
      const { error: offerUpdateErr } = await supabase
        .from("offers")
        .update({
          price_usd: o.priceUSD,
          price_brl: o.priceBRL,
          old_price: item.existingOfferId ? undefined : o.oldPriceUSD,
          in_stock: o.inStock,
          stock_quantity: o.stockQuantity,
          condition: o.condition,
          warranty: o.warranty,
          cashback: o.cashback,
          product_url: o.productUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingOfferId);

      if (offerUpdateErr) throw new Error(`offer update: ${offerUpdateErr.message}`);

      // Record price history.
      await supabase.from("price_history").insert({
        offer_id: existingOfferId,
        price_usd: o.priceUSD,
        price_brl: o.priceBRL,
        source: "connector",
      });

      return { productSlug: p.slug, storeSlug: o.storeSlug, action: "updated", productId, offerId: existingOfferId };
    }

    // New offer (or new product + new offer).
    const { data: offerData, error: offerErr } = await supabase
      .from("offers")
      .upsert(
        {
          product_id: productId,
          store_id: storeId,
          currency: o.currency,
          price_usd: o.priceUSD,
          price_brl: o.priceBRL,
          old_price: o.oldPriceUSD,
          in_stock: o.inStock,
          available: o.inStock,
          stock_quantity: o.stockQuantity,
          condition: o.condition,
          warranty: o.warranty,
          cashback: o.cashback,
          product_url: o.productUrl,
        },
        { onConflict: "product_id,store_id" }
      )
      .select("id")
      .single();

    if (offerErr) throw new Error(`offer upsert: ${offerErr.message}`);
    const offerId = offerData.id as string;

    const action = existingProductId ? "updated" : "created";
    return { productSlug: p.slug, storeSlug: o.storeSlug, action, productId, offerId };
  }
}
