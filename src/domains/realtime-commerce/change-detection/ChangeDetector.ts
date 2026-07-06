import { ChangeType, MarketChangeEntityType } from "../enums";
import type { CreateMarketChangeInput, DetectChangesInput } from "../types";

/** A price drop at or beyond this fraction also counts as a detected
 * promotion — explicit, explainable threshold (Epic 2/9: "todos os cálculos
 * explicáveis... nenhuma decisão mágica"), not a heuristic hidden in code. */
export const PROMOTION_PRICE_DROP_THRESHOLD = 0.15;

function percentChange(before: number, after: number): number {
  if (before === 0) return 0;
  return (after - before) / before;
}

/**
 * Pure diff of an offer/product snapshot pair into append-only market_changes
 * rows. No I/O, no dependency on any other domain — the connectors pipeline
 * (or any future producer) maps its own before/after data into OfferSnapshot
 * at the integration boundary and calls this directly.
 */
export class ChangeDetector {
  detect(input: DetectChangesInput): CreateMarketChangeInput[] {
    const { entityId, productId, storeId, before, after, isNewOffer, isNewProduct, source } = input;
    const changes: CreateMarketChangeInput[] = [];

    const base = { productId, storeId, source };

    if (isNewProduct && productId) {
      changes.push({
        ...base,
        changeType: ChangeType.ProductCreated,
        entityType: MarketChangeEntityType.Product,
        entityId: productId,
        field: "product",
        previousValue: null,
        currentValue: "created",
        confidence: 1,
      });
    }

    if (isNewOffer) {
      changes.push({
        ...base,
        changeType: ChangeType.OfferCreated,
        entityType: MarketChangeEntityType.Offer,
        entityId,
        field: "offer",
        previousValue: null,
        currentValue: "created",
        confidence: 1,
      });
    }

    if (!before) return changes;

    if (before.priceUSD !== after.priceUSD) {
      const pct = percentChange(before.priceUSD, after.priceUSD);
      changes.push({
        ...base,
        changeType: pct > 0 ? ChangeType.PriceIncreased : ChangeType.PriceDecreased,
        entityType: MarketChangeEntityType.Offer,
        entityId,
        field: "price_usd",
        previousValue: String(before.priceUSD),
        currentValue: String(after.priceUSD),
        confidence: 1,
      });

      if (pct <= -PROMOTION_PRICE_DROP_THRESHOLD) {
        changes.push({
          ...base,
          changeType: ChangeType.PromotionDetected,
          entityType: MarketChangeEntityType.Offer,
          entityId,
          field: "promotion",
          previousValue: String(before.priceUSD),
          currentValue: String(after.priceUSD),
          confidence: Math.min(1, Math.abs(pct)),
        });
      }
    }

    if (before.inStock !== after.inStock) {
      changes.push({
        ...base,
        changeType: after.inStock ? ChangeType.StockReturned : ChangeType.StockOut,
        entityType: MarketChangeEntityType.Offer,
        entityId,
        field: "in_stock",
        previousValue: String(before.inStock),
        currentValue: String(after.inStock),
        confidence: 1,
      });
    } else if (before.stockQuantity !== after.stockQuantity) {
      changes.push({
        ...base,
        changeType: ChangeType.StockQuantityChanged,
        entityType: MarketChangeEntityType.Offer,
        entityId,
        field: "stock_quantity",
        previousValue: before.stockQuantity === null ? null : String(before.stockQuantity),
        currentValue: after.stockQuantity === null ? null : String(after.stockQuantity),
        confidence: 1,
      });
    }

    if ((before.description ?? "") !== (after.description ?? "")) {
      changes.push({
        ...base,
        changeType: ChangeType.DescriptionChanged,
        entityType: MarketChangeEntityType.Offer,
        entityId,
        field: "description",
        previousValue: before.description,
        currentValue: after.description,
        confidence: 1,
      });
    }

    if ((before.imageUrl ?? null) !== (after.imageUrl ?? null)) {
      changes.push({
        ...base,
        changeType: ChangeType.ImageChanged,
        entityType: MarketChangeEntityType.Offer,
        entityId,
        field: "image_url",
        previousValue: before.imageUrl,
        currentValue: after.imageUrl,
        confidence: 1,
      });
    }

    if ((before.categorySlug ?? null) !== (after.categorySlug ?? null)) {
      changes.push({
        ...base,
        changeType: ChangeType.CategoryChanged,
        entityType: MarketChangeEntityType.Offer,
        entityId,
        field: "category",
        previousValue: before.categorySlug,
        currentValue: after.categorySlug,
        confidence: 1,
      });
    }

    if ((before.brandSlug ?? null) !== (after.brandSlug ?? null)) {
      changes.push({
        ...base,
        changeType: ChangeType.BrandChanged,
        entityType: MarketChangeEntityType.Offer,
        entityId,
        field: "brand",
        previousValue: before.brandSlug,
        currentValue: after.brandSlug,
        confidence: 1,
      });
    }

    return changes;
  }
}
