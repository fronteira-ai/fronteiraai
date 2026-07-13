import { SearchIntelligenceComposer } from "../services/SearchIntelligenceComposer";
import { PriceIntelligenceService } from "@/src/domains/market-insights";
import type { ICanonicalCatalogRepository } from "@/src/domains/canonical-catalog";

function makeCatalogRepo(overrides: Partial<ICanonicalCatalogRepository> = {}): ICanonicalCatalogRepository {
  return {
    findBySlug: jest.fn(),
    findById: jest.fn(),
    findOrCreateBySlug: jest.fn(),
    updateSyncedFields: jest.fn(),
    findByBrandId: jest.fn(),
    findByCategoryId: jest.fn(),
    findCanonicalProductIdByProductId: jest.fn().mockResolvedValue(null),
    findAll: jest.fn(),
    linkOffer: jest.fn(),
    findOffersByCanonicalProductId: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    ...overrides,
  };
}

describe("SearchIntelligenceComposer", () => {
  it("marks belowAveragePrice=false for products with no known price", async () => {
    const catalogRepo = makeCatalogRepo();
    const composer = new SearchIntelligenceComposer(catalogRepo, new PriceIntelligenceService(catalogRepo));

    const result = await composer.composeForProducts([{ productId: "p1", priceUSD: null }]);
    expect(result.get("p1")).toEqual({ productId: "p1", belowAveragePrice: false });
  });

  it("marks belowAveragePrice=false for products with no canonical link yet", async () => {
    const catalogRepo = makeCatalogRepo({ findCanonicalProductIdByProductId: jest.fn().mockResolvedValue(null) });
    const composer = new SearchIntelligenceComposer(catalogRepo, new PriceIntelligenceService(catalogRepo));

    const result = await composer.composeForProducts([{ productId: "p1", priceUSD: 50 }]);
    expect(result.get("p1")).toEqual({ productId: "p1", belowAveragePrice: false });
  });

  it("marks belowAveragePrice=true when the given price is well under the cross-store median", async () => {
    const catalogRepo = makeCatalogRepo({
      findCanonicalProductIdByProductId: jest.fn().mockResolvedValue("canonical-1"),
      findOffersByCanonicalProductId: jest.fn().mockResolvedValue({
        items: [
          { offerId: "a", productId: "p1", storeId: "s1", storeSlug: "s1", priceUSD: 100, inStock: true, stockQuantity: 1, updatedAt: new Date().toISOString(), condition: null, warranty: null, productUrl: null },
          { offerId: "b", productId: "p2", storeId: "s2", storeSlug: "s2", priceUSD: 100, inStock: true, stockQuantity: 1, updatedAt: new Date().toISOString(), condition: null, warranty: null, productUrl: null },
        ],
        total: 2,
      }),
    });
    const composer = new SearchIntelligenceComposer(catalogRepo, new PriceIntelligenceService(catalogRepo));

    // Median of [100, 100] is 100; 50 is well under 90% of that.
    const result = await composer.composeForProducts([{ productId: "p1", priceUSD: 50 }]);
    expect(result.get("p1")).toEqual({ productId: "p1", belowAveragePrice: true });
  });
});
