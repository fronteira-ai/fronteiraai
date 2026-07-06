// Real-Time Commerce Engine (Release 1.8 — Program A — Wave 2).
// Every enum value here mirrors the `CHECK (... IN (...))` constraint of its
// column in supabase/migrations/20260703170000_realtime_commerce.sql — keep
// both in sync by hand, same discipline as src/domains/exchange/enums.

/** Epic 2 — Change Detection Engine. One value per detectable market change. */
export enum ChangeType {
  PriceIncreased = "price_increased",
  PriceDecreased = "price_decreased",
  StockReturned = "stock_returned",
  StockOut = "stock_out",
  StockQuantityChanged = "stock_quantity_changed",
  ProductCreated = "product_created",
  ProductRemoved = "product_removed",
  OfferCreated = "offer_created",
  OfferRemoved = "offer_removed",
  ImageChanged = "image_changed",
  DescriptionChanged = "description_changed",
  CategoryChanged = "category_changed",
  BrandChanged = "brand_changed",
  PromotionDetected = "promotion_detected",
  CanonicalUpdated = "canonical_updated",
}

export enum MarketChangeEntityType {
  Offer = "offer",
  Product = "product",
}

/** Epic 3 — Price Volatility Engine classification bands, 0-100 score. */
export enum VolatilityClass {
  MuitoEstavel = "muito_estavel",
  Estavel = "estavel",
  Moderado = "moderado",
  Volatil = "volatil",
  MuitoVolatil = "muito_volatil",
}

/** Epic 4 — Freshness Engine classification bands. Thresholds live in
 * freshness/FreshnessEngine.ts (single source of truth, kept explainable). */
export enum FreshnessClass {
  Live = "live",
  Fresh = "fresh",
  Recent = "recent",
  Old = "old",
  Stale = "stale",
}

/** Epic 8 — Buyer Alert Engine foundation. No delivery channel exists yet —
 * this only classifies which market_changes are alert-worthy. */
export enum AlertType {
  PriceDrop = "price_drop",
  StockReturned = "stock_returned",
  NewPromotion = "new_promotion",
  NewProduct = "new_product",
  RelevantChange = "relevant_change",
}

export enum AlertCandidateStatus {
  Pending = "pending",
  Suppressed = "suppressed",
  Expired = "expired",
}
