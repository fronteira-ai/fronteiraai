import type { DeduplicatedOffer, PersistenceResult, PipelineContext } from "../../types/pipeline.types";
import type { ICatalogRepository } from "../../repositories/ICatalogRepository";
import type { ISyncStage } from "./ISyncStage";
import { recordStage, recordError } from "../metrics";

export class CatalogWriteStage implements ISyncStage {
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
        });
        skipped++;
        continue;
      }

      try {
        const result = await this.persist(ctx.catalogRepo, item);
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

  private async persist(catalogRepo: ICatalogRepository, item: DeduplicatedOffer): Promise<PersistenceResult> {
    const { normalized, status, existingProductId, existingOfferId } = item;
    const { product: p, offer: o } = normalized;

    // 1. Upsert brand.
    const brandId = await catalogRepo.upsertBrand(p.brandName, p.brandSlug);

    // 2. Upsert category.
    const categoryId = await catalogRepo.upsertCategory(p.categoryName, p.categorySlug);

    // 3. Store must already exist — we don't create stores automatically.
    const storeId = await catalogRepo.findStoreIdBySlug(o.storeSlug);
    if (!storeId) throw new Error(`store not found: ${o.storeSlug}`);

    // 4. Upsert product.
    const imageUrl = normalized.resolvedImageUrl ?? p.imageUrl;
    const productId = await catalogRepo.upsertProduct({
      name: p.name,
      slug: p.slug,
      description: p.description,
      brandId,
      categoryId,
      imageUrl,
      specifications: Object.keys(p.specifications).length > 0 ? p.specifications : null,
    });

    // 5. Upsert offer.
    if (status === "update" && existingOfferId) {
      await catalogRepo.updateOffer(existingOfferId, {
        priceUSD: o.priceUSD,
        priceBRL: o.priceBRL,
        inStock: o.inStock,
        stockQuantity: o.stockQuantity,
        condition: o.condition,
        warranty: o.warranty,
        cashback: o.cashback,
        productUrl: o.productUrl,
      });

      await catalogRepo.insertPriceHistory({
        offerId: existingOfferId,
        priceUSD: o.priceUSD,
        priceBRL: o.priceBRL,
        source: "crawler",
      });

      return { productSlug: p.slug, storeSlug: o.storeSlug, action: "updated", productId, offerId: existingOfferId };
    }

    // New offer (or new product + new offer).
    const offerId = await catalogRepo.upsertOffer({
      productId,
      storeId,
      currency: o.currency,
      priceUSD: o.priceUSD,
      priceBRL: o.priceBRL,
      oldPriceUSD: o.oldPriceUSD,
      inStock: o.inStock,
      stockQuantity: o.stockQuantity,
      condition: o.condition,
      warranty: o.warranty,
      cashback: o.cashback,
      productUrl: o.productUrl,
    });

    // Wave 3: every offer accumulates price_history from its first sync, not
    // just its first update (known gap since Epic 1 — see ICatalogRepository
    // .insertPriceHistory doc comment, now removed).
    await catalogRepo.insertPriceHistory({
      offerId,
      priceUSD: o.priceUSD,
      priceBRL: o.priceBRL,
      source: "crawler",
    });

    const action = existingProductId ? "updated" : "created";
    return { productSlug: p.slug, storeSlug: o.storeSlug, action, productId, offerId };
  }
}
