import type { NormalizedOffer, DeduplicatedOffer, IPipelineStage, PipelineContext } from "../types/pipeline";
import { recordStage, recordError } from "../observability/metrics";

export class DeduplicationEngine implements IPipelineStage {
  readonly name = "deduplication";

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    const startedAt = new Date().toISOString();
    const deduplicated: DeduplicatedOffer[] = [];
    let skipped = 0;

    // Batch-fetch existing products by slug for all items in this batch.
    const slugs = [...new Set(ctx.normalized.map((n) => n.product.slug))];
    const existingProducts = await this.fetchExistingProducts(ctx, slugs);

    for (const normalized of ctx.normalized) {
      try {
        const result = await this.classify(ctx, normalized, existingProducts);
        if (result.status === "skip") skipped++;
        deduplicated.push(result);
      } catch (err) {
        skipped++;
        recordError(ctx, this.name, String(err), normalized.product.slug);
      }
    }

    ctx.deduplicated = deduplicated;
    ctx.metrics.totals.deduplicated = deduplicated.filter((d) => d.status !== "skip").length;
    ctx.metrics.totals.skipped += skipped;
    recordStage(ctx, this.name, startedAt, deduplicated.length - skipped, 0, skipped);
    return ctx;
  }

  private async fetchExistingProducts(
    ctx: PipelineContext,
    slugs: string[]
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (slugs.length === 0) return map;

    const { data, error } = await ctx.supabase
      .from("products")
      .select("id, slug")
      .in("slug", slugs);

    if (error) {
      console.error("[deduplication] fetchExistingProducts:", error.message);
      return map;
    }

    for (const row of data ?? []) {
      map.set(row.slug as string, row.id as string);
    }
    return map;
  }

  private async classify(
    ctx: PipelineContext,
    normalized: NormalizedOffer,
    existingProducts: Map<string, string>
  ): Promise<DeduplicatedOffer> {
    const productSlug = normalized.product.slug;
    const existingProductId = existingProducts.get(productSlug);

    if (!existingProductId) {
      return { normalized, status: "new" };
    }

    // Product exists — check if an offer for this store also exists.
    const storeRow = await ctx.supabase
      .from("stores")
      .select("id")
      .eq("slug", normalized.offer.storeSlug)
      .maybeSingle();

    if (!storeRow.data) {
      return { normalized, status: "new", existingProductId };
    }

    const storeId = storeRow.data.id as string;

    const { data: existingOffer } = await ctx.supabase
      .from("offers")
      .select("id, price_usd")
      .eq("product_id", existingProductId)
      .eq("store_id", storeId)
      .maybeSingle();

    if (!existingOffer) {
      return { normalized, status: "new", existingProductId };
    }

    const existingOfferId = existingOffer.id as string;
    const priceChanged = existingOffer.price_usd !== normalized.offer.priceUSD;

    if (!priceChanged) {
      return { normalized, status: "skip", existingProductId, existingOfferId };
    }

    return { normalized, status: "update", existingProductId, existingOfferId };
  }
}
