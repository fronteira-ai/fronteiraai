import { ChangeDetector, PROMOTION_PRICE_DROP_THRESHOLD } from "../change-detection/ChangeDetector";
import { ChangeType, MarketChangeEntityType } from "../enums";
import type { DetectChangesInput, OfferSnapshot } from "../types";

function snapshot(overrides: Partial<OfferSnapshot> = {}): OfferSnapshot {
  return {
    priceUSD: 100,
    inStock: true,
    stockQuantity: 10,
    description: "desc",
    imageUrl: "https://example.com/a.png",
    categorySlug: "cat-a",
    brandSlug: "brand-a",
    ...overrides,
  };
}

function baseInput(overrides: Partial<DetectChangesInput> = {}): DetectChangesInput {
  return {
    entityId: "offer-1",
    productId: "product-1",
    storeId: "store-1",
    before: snapshot(),
    after: snapshot(),
    isNewOffer: false,
    isNewProduct: false,
    source: "crawler",
    ...overrides,
  };
}

describe("ChangeDetector", () => {
  const detector = new ChangeDetector();

  it("emits ProductCreated and OfferCreated for a brand new product+offer, nothing else", () => {
    const changes = detector.detect(baseInput({ before: null, isNewOffer: true, isNewProduct: true }));

    expect(changes).toHaveLength(2);
    expect(changes.map((c) => c.changeType)).toEqual(
      expect.arrayContaining([ChangeType.ProductCreated, ChangeType.OfferCreated])
    );
    expect(changes.every((c) => c.entityId === "offer-1" || c.entityId === "product-1")).toBe(true);
  });

  it("emits only OfferCreated when the product already exists", () => {
    const changes = detector.detect(baseInput({ before: null, isNewOffer: true, isNewProduct: false }));
    expect(changes).toHaveLength(1);
    expect(changes[0].changeType).toBe(ChangeType.OfferCreated);
  });

  it("detects a price increase", () => {
    const changes = detector.detect(baseInput({ after: snapshot({ priceUSD: 120 }) }));
    const priceChange = changes.find((c) => c.field === "price_usd");
    expect(priceChange?.changeType).toBe(ChangeType.PriceIncreased);
    expect(priceChange?.previousValue).toBe("100");
    expect(priceChange?.currentValue).toBe("120");
  });

  it("detects a price decrease", () => {
    const changes = detector.detect(baseInput({ after: snapshot({ priceUSD: 90 }) }));
    const priceChange = changes.find((c) => c.field === "price_usd");
    expect(priceChange?.changeType).toBe(ChangeType.PriceDecreased);
  });

  it("also flags a promotion when the price drop crosses the threshold", () => {
    const droppedPrice = 100 * (1 - PROMOTION_PRICE_DROP_THRESHOLD - 0.01);
    const changes = detector.detect(baseInput({ after: snapshot({ priceUSD: droppedPrice }) }));

    expect(changes.some((c) => c.changeType === ChangeType.PriceDecreased)).toBe(true);
    expect(changes.some((c) => c.changeType === ChangeType.PromotionDetected)).toBe(true);
  });

  it("does not flag a promotion for a small price drop", () => {
    const changes = detector.detect(baseInput({ after: snapshot({ priceUSD: 98 }) }));
    expect(changes.some((c) => c.changeType === ChangeType.PromotionDetected)).toBe(false);
  });

  it("detects stock returned and stock out", () => {
    const returned = detector.detect(
      baseInput({ before: snapshot({ inStock: false }), after: snapshot({ inStock: true }) })
    );
    expect(returned.find((c) => c.field === "in_stock")?.changeType).toBe(ChangeType.StockReturned);

    const out = detector.detect(
      baseInput({ before: snapshot({ inStock: true }), after: snapshot({ inStock: false }) })
    );
    expect(out.find((c) => c.field === "in_stock")?.changeType).toBe(ChangeType.StockOut);
  });

  it("detects a stock quantity change only when in-stock status is unchanged", () => {
    const changes = detector.detect(
      baseInput({ before: snapshot({ stockQuantity: 10 }), after: snapshot({ stockQuantity: 3 }) })
    );
    expect(changes.find((c) => c.field === "stock_quantity")?.changeType).toBe(ChangeType.StockQuantityChanged);
  });

  it("detects description and image changes", () => {
    const changes = detector.detect(
      baseInput({
        after: snapshot({ description: "new desc", imageUrl: "https://example.com/b.png" }),
      })
    );
    expect(changes.some((c) => c.changeType === ChangeType.DescriptionChanged)).toBe(true);
    expect(changes.some((c) => c.changeType === ChangeType.ImageChanged)).toBe(true);
  });

  it("detects category and brand changes", () => {
    const changes = detector.detect(
      baseInput({ after: snapshot({ categorySlug: "cat-b", brandSlug: "brand-b" }) })
    );
    expect(changes.some((c) => c.changeType === ChangeType.CategoryChanged)).toBe(true);
    expect(changes.some((c) => c.changeType === ChangeType.BrandChanged)).toBe(true);
  });

  it("returns no changes when before and after are identical", () => {
    const changes = detector.detect(baseInput());
    expect(changes).toHaveLength(0);
  });

  it("returns an empty array when there is no before snapshot and nothing is new", () => {
    const changes = detector.detect(baseInput({ before: null, isNewOffer: false, isNewProduct: false }));
    expect(changes).toHaveLength(0);
  });

  it("every emitted change carries the offer entity type unless it is ProductCreated", () => {
    const changes = detector.detect(baseInput({ before: null, isNewOffer: true, isNewProduct: true }));
    const offerCreated = changes.find((c) => c.changeType === ChangeType.OfferCreated);
    const productCreated = changes.find((c) => c.changeType === ChangeType.ProductCreated);
    expect(offerCreated?.entityType).toBe(MarketChangeEntityType.Offer);
    expect(productCreated?.entityType).toBe(MarketChangeEntityType.Product);
  });
});
