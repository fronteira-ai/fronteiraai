import { CompareFoundationService } from "../services/CompareFoundationService";
import { CanonicalProductService } from "../services/CanonicalProductService";
import { OfferRankingService } from "../services/OfferRankingService";
import { CanonicalPriceHistoryService } from "../services/CanonicalPriceHistoryService";
import type { ICanonicalCatalogRepository } from "../repositories/ICanonicalCatalogRepository";
import type { ICanonicalPriceHistoryRepository } from "../repositories/ICanonicalPriceHistoryRepository";
import type { CanonicalProduct } from "../domain/CanonicalProduct";
import type { CanonicalOfferView } from "../types/canonical-catalog.types";

function makeCanonicalProduct(): CanonicalProduct {
  return {
    id: "canonical-1",
    canonicalSlug: "iphone-15-pro",
    name: "iPhone 15 Pro",
    brandId: "brand-1",
    categoryId: "category-1",
    imageUrl: null,
    specifications: null,
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
  };
}

function makeOffer(overrides: Partial<CanonicalOfferView> = {}): CanonicalOfferView {
  return {
    offerId: "offer-1",
    storeId: "store-1",
    storeSlug: "test-store",
    priceUSD: 100,
    inStock: true,
    stockQuantity: 5,
    updatedAt: new Date().toISOString(),
    condition: "new",
    warranty: null,
    productUrl: null,
    ...overrides,
  };
}

describe("CompareFoundationService", () => {
  it("returns null when the canonical product doesn't exist", async () => {
    const catalogRepo: ICanonicalCatalogRepository = {
      findBySlug: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      findOrCreateBySlug: jest.fn(),
      findByBrandId: jest.fn(),
      linkOffer: jest.fn(),
      findOffersByCanonicalProductId: jest.fn(),
    };
    const service = new CompareFoundationService(
      new CanonicalProductService(catalogRepo),
      catalogRepo,
      new OfferRankingService(),
      new CanonicalPriceHistoryService({ findByCanonicalProductId: jest.fn() })
    );

    const result = await service.getForSlug("does-not-exist", () => false);
    expect(result).toBeNull();
  });

  it("composes offers, ranking, and price history for an existing canonical product", async () => {
    const canonicalProduct = makeCanonicalProduct();
    const offers = [makeOffer({ offerId: "a", priceUSD: 100 }), makeOffer({ offerId: "b", priceUSD: 90, storeId: "store-2" })];

    const catalogRepo: ICanonicalCatalogRepository = {
      findBySlug: jest.fn().mockResolvedValue(canonicalProduct),
      findById: jest.fn(),
      findOrCreateBySlug: jest.fn(),
      findByBrandId: jest.fn(),
      linkOffer: jest.fn(),
      findOffersByCanonicalProductId: jest.fn().mockResolvedValue({ items: offers, total: 2 }),
    };

    const priceHistoryRepo: ICanonicalPriceHistoryRepository = {
      findByCanonicalProductId: jest.fn().mockResolvedValue([]),
    };

    const service = new CompareFoundationService(
      new CanonicalProductService(catalogRepo),
      catalogRepo,
      new OfferRankingService(),
      new CanonicalPriceHistoryService(priceHistoryRepo)
    );

    const resolveIsVerified = jest.fn().mockImplementation((storeId: string) => storeId === "store-2");
    const result = await service.getForSlug("iphone-15-pro", resolveIsVerified);

    expect(result).not.toBeNull();
    expect(result!.canonicalProduct).toBe(canonicalProduct);
    expect(result!.totalOffers).toBe(2);
    expect(result!.rankedOffers).toHaveLength(2);
    // Cheaper AND verified store should rank first.
    expect(result!.rankedOffers[0].offer.offerId).toBe("b");
    expect(result!.priceAggregation.lowestPriceUSD).toBe(90);
    expect(resolveIsVerified).toHaveBeenCalledWith("store-1");
    expect(resolveIsVerified).toHaveBeenCalledWith("store-2");
  });
});
