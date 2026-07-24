import type { DeduplicatedOffer, PersistenceResult, PipelineContext } from "../../types/pipeline.types";
import type { ICatalogRepository } from "../../repositories/ICatalogRepository";
import type { GatekeeperDependencies } from "../../normalization/BrandCategoryGatekeeper";
import { resolveBrand, resolveCategory } from "../../normalization/BrandCategoryGatekeeper";
import { buildProductSignature } from "@/src/domains/product-intelligence";
import { slugify } from "@/utils/slug";
import type { MarketplaceMemoryService } from "@/src/domains/marketplace-memory";
import type { ISyncStage } from "./ISyncStage";
import { recordStage, recordError } from "../metrics";

function makeGatekeeperDeps(catalogRepo: ICatalogRepository, marketplaceMemoryService: MarketplaceMemoryService | null): GatekeeperDependencies {
  return {
    findBrandByNormalizedName: (normalized) => catalogRepo.findBrandByNormalizedName(normalized),
    findCategoryByNormalizedName: (taxonomySlug) => catalogRepo.findCategoryByNormalizedName(taxonomySlug),
    findBrandIdByIdentifier: (type, value) => catalogRepo.findBrandIdByIdentifier(type, value),
    findLearnedCorrection: async (storeId, rawValue, concept) => {
      if (!marketplaceMemoryService) return null;
      const pattern = await marketplaceMemoryService.getPattern(storeId, rawValue);
      if (!pattern || pattern.concept !== concept) return null;
      return pattern.resolvedValue;
    },
  };
}

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
    const deps = makeGatekeeperDeps(ctx.catalogRepo, ctx.marketplaceMemoryService);

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
        const result = await this.persist(ctx.catalogRepo, deps, item);
        results.push(result);
        if (result.action === "error") failed++;
        else if (result.action === "skipped") skipped++;
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

  // Mission Ω-Gatekeeper (Catalog Integrity Firewall). Every write now
  // resolves brand AND category through the mandatory chain (normalize ->
  // existing/equivalent -> ProductSignature EAN/MPN -> learned correction ->
  // forbidden/generic-token rejection) before a single row is upserted.
  // "Nunca: Raw Value -> INSERT" — if either field can't be confirmed
  // deterministically, the product/offer is NOT written; a
  // catalog_pending_review row captures the full payload instead, and this
  // item is reported as "skipped" (same convention as an unchanged offer or
  // a dry run), never "error" (nothing went wrong — a human decision is
  // just still pending).
  private async persist(catalogRepo: ICatalogRepository, deps: GatekeeperDependencies, item: DeduplicatedOffer): Promise<PersistenceResult> {
    const { normalized, status, existingProductId, existingOfferId } = item;
    const { product: p, offer: o } = normalized;

    const storeId = await catalogRepo.findStoreIdBySlug(o.storeSlug);
    if (!storeId) throw new Error(`store not found: ${o.storeSlug}`);

    const [brandDecision, categoryDecision] = await Promise.all([
      resolveBrand({ rawBrandName: p.brandName, storeId, productName: p.name, specifications: p.specifications }, deps),
      resolveCategory({ rawCategoryName: p.categoryName, storeId }, deps),
    ]);

    if (brandDecision.decision === "pending_review" || categoryDecision.decision === "pending_review") {
      if (brandDecision.decision === "pending_review") {
        await catalogRepo.createPendingReview({
          productId: null,
          storeId,
          fieldType: "brand",
          rawValue: brandDecision.rawValue,
          reasons: brandDecision.reasons,
          payload: normalized,
        });
      }
      if (categoryDecision.decision === "pending_review") {
        await catalogRepo.createPendingReview({
          productId: null,
          storeId,
          fieldType: "category",
          rawValue: categoryDecision.rawValue,
          reasons: categoryDecision.reasons,
          payload: normalized,
        });
      }
      return {
        productSlug: p.slug,
        storeSlug: o.storeSlug,
        action: "skipped",
      };
    }

    // 1. Upsert brand — using the Gatekeeper's CONFIRMED value, never the
    // raw connector string directly.
    const brandId = await catalogRepo.upsertBrand(brandDecision.value, slugify(brandDecision.value));

    // 2. Upsert category — same discipline.
    const categoryId = await catalogRepo.upsertCategory(categoryDecision.value, slugify(categoryDecision.value));

    // 3. Upsert product.
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

    // Grow the Camada 1 (EAN/MPN) index for future products — best-effort,
    // never blocks this write. Only recorded for a brand that was actually
    // CONFIRMED this call (existing/identifier/learned-pattern/new), same
    // discipline as Marketplace Memory: never persisted from an unverified
    // guess.
    await this.recordIdentifiersIfPresent(catalogRepo, productId, brandId, p.name, p.specifications);

    // 4. Upsert offer.
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

      return {
        productSlug: p.slug,
        storeSlug: o.storeSlug,
        action: "updated",
        productId,
        offerId: existingOfferId,
        storeId,
      };
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
    return { productSlug: p.slug, storeSlug: o.storeSlug, action, productId, offerId, storeId };
  }

  private async recordIdentifiersIfPresent(
    catalogRepo: ICatalogRepository,
    productId: string,
    brandId: string,
    name: string,
    specifications: Record<string, string>
  ): Promise<void> {
    const signature = buildProductSignature({ id: productId, name, brandName: null, specifications });
    if (signature.ean.value) {
      await catalogRepo.recordProductIdentifier({ productId, identifierType: "ean", identifierValue: signature.ean.value, brandId });
    }
    if (signature.manufacturerCode.value) {
      await catalogRepo.recordProductIdentifier({ productId, identifierType: "manufacturer_code", identifierValue: signature.manufacturerCode.value, brandId });
    }
  }
}
