import type { NormalizedOffer, DeduplicatedOffer, PipelineContext } from "../../types/pipeline.types";
import type { ExistingOfferLookup } from "../../repositories/ICatalogRepository";
import type { ISyncStage } from "./ISyncStage";
import { recordStage, recordError } from "../metrics";

export class DeduplicationStage implements ISyncStage {
  readonly name = "deduplication";

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    const startedAt = new Date().toISOString();
    const deduplicated: DeduplicatedOffer[] = [];
    let skipped = 0;

    // Batch-fetch existing products by slug for all items in this batch.
    const slugs = [...new Set(ctx.normalized.map((n) => n.product.slug))];
    const existingProducts = await ctx.catalogRepo.findProductIdsBySlugs(slugs);

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

    const storeId = await ctx.catalogRepo.findStoreIdBySlug(normalized.offer.storeSlug);
    if (!storeId) {
      return { normalized, status: "new", existingProductId };
    }

    const existingOffer = await ctx.catalogRepo.findOfferByProductAndStore(existingProductId, storeId);
    if (!existingOffer) {
      return { normalized, status: "new", existingProductId };
    }

    if (!this.hasChanged(normalized, existingOffer)) {
      return {
        normalized,
        status: "skip",
        existingProductId,
        existingOfferId: existingOffer.offerId,
        existingSnapshot: existingOffer,
      };
    }

    return {
      normalized,
      status: "update",
      existingProductId,
      existingOfferId: existingOffer.offerId,
      existingSnapshot: existingOffer,
    };
  }

  // Wave 3 — Change Detection: replaces the price-only comparison
  // (acquisition/engines/deduplication.engine.ts-era gap) with stock,
  // description and image, per RELEASE_1_7_BLUEPRINT.md Wave 3 scope.
  private hasChanged(normalized: NormalizedOffer, existing: ExistingOfferLookup): boolean {
    if (existing.priceUSD !== normalized.offer.priceUSD) return true;
    if (existing.inStock !== normalized.offer.inStock) return true;
    if (existing.stockQuantity !== normalized.offer.stockQuantity) return true;
    if ((existing.description ?? "") !== normalized.product.description) return true;
    if ((existing.imageUrl ?? null) !== normalized.product.imageUrl) return true;
    return false;
  }
}
