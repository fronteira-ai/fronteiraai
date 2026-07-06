import type { PipelineContext } from "../../types/pipeline.types";
import type { ISyncStage } from "./ISyncStage";
import { recordStage, recordError } from "../metrics";
import type { OfferSnapshot } from "@/src/domains/realtime-commerce";

// Real-Time Commerce Engine (Release 1.8 — Program A — Wave 2), Epic 2.
// Runs after CatalogWriteStage and diffs each persisted item's pre-write
// snapshot (captured by DeduplicationStage as `existingSnapshot`) against
// its just-written state, recording every detected change into
// market_changes. Mirrors ProductIdentityShadowStage's shape (a stage that
// calls into a Core Asset domain connectors/ depends on but never owns) but
// is NOT shadow mode — these writes are real and feed Volatility, Freshness,
// Market Pulse and the rest of the Wave 2 domain directly.
//
// Scope note (documented in TECH_DEBT.md): this stage only detects changes
// to offers/products it just wrote. It does NOT detect ProductRemoved/
// OfferRemoved by diffing a store's full catalog against a previous sync —
// that requires knowing a connector run is exhaustive (vs. partial/paginated),
// which no ConnectorMetadata/SyncRunOptions field expresses today. Building
// that safely (without false-positiving a partial sync's untouched offers as
// "removed") is out of scope for this Wave.
export class MarketChangeDetectionStage implements ISyncStage {
  readonly name = "market-change-detection";

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    if (ctx.dryRun) {
      recordStage(ctx, this.name, new Date().toISOString(), 0, 0, ctx.deduplicated.length);
      return ctx;
    }

    const startedAt = new Date().toISOString();
    let detected = 0;

    for (let i = 0; i < ctx.persisted.length; i++) {
      const result = ctx.persisted[i];
      const item = ctx.deduplicated[i];
      if (!item || (result.action !== "created" && result.action !== "updated")) continue;
      if (!result.offerId || !result.productId) continue;

      try {
        const { product: p, offer: o } = item.normalized;
        // categorySlug/brandSlug are always null on both sides: ExistingOfferLookup
        // (ICatalogRepository) doesn't surface the pre-write category/brand, so
        // CategoryChanged/BrandChanged are never emitted from this integration
        // point today — the detector itself supports them for any future
        // producer that can supply real before/after values.
        const before: OfferSnapshot | null = item.existingSnapshot
          ? {
              priceUSD: item.existingSnapshot.priceUSD,
              inStock: item.existingSnapshot.inStock,
              stockQuantity: item.existingSnapshot.stockQuantity,
              description: item.existingSnapshot.description,
              imageUrl: item.existingSnapshot.imageUrl,
              categorySlug: null,
              brandSlug: null,
            }
          : null;

        const after: OfferSnapshot = {
          priceUSD: o.priceUSD,
          inStock: o.inStock,
          stockQuantity: o.stockQuantity,
          description: p.description,
          imageUrl: item.normalized.resolvedImageUrl ?? p.imageUrl,
          categorySlug: null,
          brandSlug: null,
        };

        const changes = await ctx.changeDetectionService.detectAndRecord({
          entityId: result.offerId,
          productId: result.productId,
          storeId: result.storeId ?? null,
          before,
          after,
          isNewOffer: !item.existingOfferId,
          isNewProduct: !item.existingProductId,
          source: "crawler",
        });
        detected += changes.length;
      } catch (err) {
        recordError(ctx, this.name, String(err), result.productSlug);
      }
    }

    recordStage(ctx, this.name, startedAt, detected, 0, 0);
    return ctx;
  }
}
