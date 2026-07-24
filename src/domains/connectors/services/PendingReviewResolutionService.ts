import type { ICatalogRepository, PendingReviewRecord } from "../repositories/ICatalogRepository";
import type { NormalizedOffer } from "../types/pipeline.types";
import type { MarketplaceMemoryService } from "@/src/domains/marketplace-memory";
import { slugify } from "@/utils/slug";

// Mission Ω-Gatekeeper (Catalog Integrity Firewall) — Auto-Reparação.
// The other half of the mandatory chain: when a human confirms what a
// pending review's raw value actually means, this service (1) records the
// correction into merchant_attribute_patterns.resolvedValue so every future
// import of the SAME raw value from the SAME store auto-applies it (never
// asked twice), (2) completes the write this review had blocked, using the
// exact NormalizedOffer payload captured at the time, and (3) resolves
// every OTHER still-pending review for the identical (store, field, raw
// value) in the same pass — one correction clears the whole backlog of
// that one pattern, not just the single row an operator happened to open.
export class PendingReviewResolutionService {
  constructor(
    private readonly catalogRepo: ICatalogRepository,
    private readonly marketplaceMemoryService: MarketplaceMemoryService | null
  ) {}

  async resolve(review: PendingReviewRecord, resolvedValue: string, resolvedBy: string | null): Promise<void> {
    if (this.marketplaceMemoryService) {
      await this.marketplaceMemoryService.observePattern({
        storeId: review.storeId,
        rawKey: review.rawValue,
        concept: review.fieldType,
        confidence: "high",
        algorithmVersion: "1.0.0",
        resolvedValue,
      });
    }

    const duplicates = await this.catalogRepo.findPendingReviewsByStoreFieldValue(review.storeId, review.fieldType, review.rawValue);
    const all = duplicates.some((d) => d.id === review.id) ? duplicates : [review, ...duplicates];

    for (const pending of all) {
      await this.completeWrite(pending, resolvedValue, resolvedBy);
    }
  }

  private async completeWrite(review: PendingReviewRecord, resolvedValue: string, resolvedBy: string | null): Promise<void> {
    const normalized = review.payload as NormalizedOffer;

    let brandId: string | null = null;
    let categoryId: string | null = null;

    if (review.fieldType === "brand") {
      brandId = await this.catalogRepo.upsertBrand(resolvedValue, slugify(resolvedValue));
      // The category side of this same offer may have resolved fine at
      // write time (only brand was pending) — reuse what's already in the
      // payload's categoryName via a plain upsert, never re-inventing it.
      categoryId = await this.catalogRepo.upsertCategory(normalized.product.categoryName, normalized.product.categorySlug);
    } else {
      categoryId = await this.catalogRepo.upsertCategory(resolvedValue, slugify(resolvedValue));
      brandId = await this.catalogRepo.upsertBrand(normalized.product.brandName, normalized.product.brandSlug);
    }

    const productId = await this.catalogRepo.upsertProduct({
      name: normalized.product.name,
      slug: normalized.product.slug,
      description: normalized.product.description,
      brandId,
      categoryId,
      imageUrl: normalized.resolvedImageUrl ?? normalized.product.imageUrl,
      specifications: Object.keys(normalized.product.specifications).length > 0 ? normalized.product.specifications : null,
    });

    const storeId = await this.catalogRepo.findStoreIdBySlug(normalized.offer.storeSlug);
    if (storeId) {
      const offerId = await this.catalogRepo.upsertOffer({
        productId,
        storeId,
        currency: normalized.offer.currency,
        priceUSD: normalized.offer.priceUSD,
        priceBRL: normalized.offer.priceBRL,
        oldPriceUSD: normalized.offer.oldPriceUSD,
        inStock: normalized.offer.inStock,
        stockQuantity: normalized.offer.stockQuantity,
        condition: normalized.offer.condition,
        warranty: normalized.offer.warranty,
        cashback: normalized.offer.cashback,
        productUrl: normalized.offer.productUrl,
      });
      await this.catalogRepo.insertPriceHistory({ offerId, priceUSD: normalized.offer.priceUSD, priceBRL: normalized.offer.priceBRL, source: "crawler" });
    }

    await this.catalogRepo.resolvePendingReview(review.id, {
      resolvedValue,
      resolvedBrandId: review.fieldType === "brand" ? brandId : null,
      resolvedCategoryId: review.fieldType === "category" ? categoryId : null,
      resolvedBy,
    });
  }
}
