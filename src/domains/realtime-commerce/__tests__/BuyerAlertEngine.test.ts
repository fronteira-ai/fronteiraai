import { BuyerAlertEngine } from "../alerts/BuyerAlertEngine";
import { AlertType, ChangeType, MarketChangeEntityType } from "../enums";
import type { MarketChange } from "../types";

function change(overrides: Partial<MarketChange> = {}): MarketChange {
  return {
    id: "change-1",
    changeType: ChangeType.PriceDecreased,
    entityType: MarketChangeEntityType.Offer,
    entityId: "offer-1",
    productId: "product-1",
    storeId: "store-1",
    field: "price_usd",
    previousValue: "100",
    currentValue: "80",
    confidence: 1,
    source: "crawler",
    detectedAt: "2026-07-03T10:00:00Z",
    ...overrides,
  };
}

describe("BuyerAlertEngine", () => {
  const engine = new BuyerAlertEngine();

  it("classifies a price decrease as a PriceDrop candidate with priority proportional to the drop", () => {
    const candidate = engine.classify(change({ previousValue: "100", currentValue: "80" }));
    expect(candidate?.alertType).toBe(AlertType.PriceDrop);
    expect(candidate?.priority).toBe(20);
    expect(candidate?.rateLimitKey).toBe("price_drop:product-1:2026-07-03");
  });

  it("classifies a promotion as a high-priority NewPromotion candidate", () => {
    const candidate = engine.classify(change({ changeType: ChangeType.PromotionDetected }));
    expect(candidate?.alertType).toBe(AlertType.NewPromotion);
    expect(candidate?.priority).toBe(80);
  });

  it("classifies stock returned as a StockReturned candidate", () => {
    const candidate = engine.classify(
      change({ changeType: ChangeType.StockReturned, field: "in_stock", previousValue: "false", currentValue: "true" })
    );
    expect(candidate?.alertType).toBe(AlertType.StockReturned);
  });

  it("classifies a new product as a NewProduct candidate", () => {
    const candidate = engine.classify(
      change({ changeType: ChangeType.ProductCreated, entityType: MarketChangeEntityType.Product, entityId: "product-1" })
    );
    expect(candidate?.alertType).toBe(AlertType.NewProduct);
    expect(candidate?.offerId).toBeNull();
  });

  it("returns null for change types that are not alert-worthy", () => {
    const notWorthy = [
      ChangeType.PriceIncreased,
      ChangeType.StockOut,
      ChangeType.ImageChanged,
      ChangeType.DescriptionChanged,
      ChangeType.CategoryChanged,
      ChangeType.BrandChanged,
      ChangeType.StockQuantityChanged,
      ChangeType.OfferCreated,
      ChangeType.OfferRemoved,
      ChangeType.ProductRemoved,
      ChangeType.CanonicalUpdated,
    ];

    for (const changeType of notWorthy) {
      expect(engine.classify(change({ changeType }))).toBeNull();
    }
  });

  it("produces a stable rate-limit key scoped to product, alert type and day", () => {
    const a = engine.classify(change({ detectedAt: "2026-07-03T08:00:00Z" }));
    const b = engine.classify(change({ detectedAt: "2026-07-03T23:00:00Z" }));
    expect(a?.rateLimitKey).toBe(b?.rateLimitKey);
  });
});
