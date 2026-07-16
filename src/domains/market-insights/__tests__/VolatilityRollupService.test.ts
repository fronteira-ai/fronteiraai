import { VolatilityRollupService } from "../services/VolatilityRollupService";
import { VolatilityClass, ChangeType, MarketChangeEntityType } from "@/src/domains/realtime-commerce";
import type { ICanonicalCatalogRepository, CanonicalProduct } from "@/src/domains/canonical-catalog";
import type { VolatilityService, IMarketChangeRepository, MarketChange } from "@/src/domains/realtime-commerce";

function makeCatalogRepo(overrides: Partial<ICanonicalCatalogRepository> = {}): ICanonicalCatalogRepository {
  return {
    findBySlug: jest.fn(),
    findById: jest.fn(),
    findOrCreateBySlug: jest.fn(),
    updateSyncedFields: jest.fn(),
    findByBrandId: jest.fn(),
    findByCategoryId: jest.fn(),
    findCanonicalProductIdByProductId: jest.fn(),
    findCategorySlugsByIds: jest.fn().mockResolvedValue(new Map()),
    findAll: jest.fn(),
    linkOffer: jest.fn(),
    findOffersByCanonicalProductId: jest.fn(),
    findOfferIdsByCanonicalProductId: jest.fn(),
    reassignOffers: jest.fn(),
    reassignOffersByIds: jest.fn(),
    deactivateAndMerge: jest.fn(),
    reactivate: jest.fn(),
    ...overrides,
  };
}

function makeChangeRepo(overrides: Partial<IMarketChangeRepository> = {}): IMarketChangeRepository {
  return {
    insertMany: jest.fn(),
    countInRange: jest.fn(),
    listInRange: jest.fn(),
    latestForEntity: jest.fn(),
    listForProduct: jest.fn(),
    listForStore: jest.fn(),
    ...overrides,
  };
}

describe("VolatilityRollupService", () => {
  describe("getCanonicalVolatility", () => {
    it("returns null when the canonical product has no linked offers", async () => {
      const catalogRepo = makeCatalogRepo({
        findOffersByCanonicalProductId: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      });
      const volatilityService = { computeForProduct: jest.fn() } as unknown as VolatilityService;
      const service = new VolatilityRollupService(catalogRepo, volatilityService, makeChangeRepo());

      expect(await service.getCanonicalVolatility("canonical-1")).toBeNull();
    });

    it("averages VolatilityEngine scores across every distinct raw product linked to the canonical product", async () => {
      const catalogRepo = makeCatalogRepo({
        findOffersByCanonicalProductId: jest.fn().mockResolvedValue({
          items: [
            { offerId: "o1", productId: "p1", storeId: "s1", storeSlug: "s1", priceUSD: 1, inStock: true, stockQuantity: null, updatedAt: "", condition: null, warranty: null, productUrl: null },
            { offerId: "o2", productId: "p2", storeId: "s2", storeSlug: "s2", priceUSD: 1, inStock: true, stockQuantity: null, updatedAt: "", condition: null, warranty: null, productUrl: null },
          ],
          total: 2,
        }),
      });

      const computeForProduct = jest.fn().mockImplementation((productId: string) => {
        const score = productId === "p1" ? 80 : 40;
        return Promise.resolve({ productId, score, classification: VolatilityClass.Volatil, factors: {}, sampleSize: 5, windowDays: 30, computedAt: "" });
      });
      const volatilityService = { computeForProduct } as unknown as VolatilityService;

      const service = new VolatilityRollupService(catalogRepo, volatilityService, makeChangeRepo());
      const result = await service.getCanonicalVolatility("canonical-1");

      expect(result?.score).toBe(60);
      expect(result?.productsScored).toBe(2);
      expect(computeForProduct).toHaveBeenCalledTimes(2);
    });

    it("excludes products with fewer than 2 price points from the average", async () => {
      const catalogRepo = makeCatalogRepo({
        findOffersByCanonicalProductId: jest.fn().mockResolvedValue({
          items: [{ offerId: "o1", productId: "p1", storeId: "s1", storeSlug: "s1", priceUSD: 1, inStock: true, stockQuantity: null, updatedAt: "", condition: null, warranty: null, productUrl: null }],
          total: 1,
        }),
      });
      const computeForProduct = jest.fn().mockResolvedValue({ productId: "p1", score: 0, classification: VolatilityClass.MuitoEstavel, factors: {}, sampleSize: 0, windowDays: 30, computedAt: "" });
      const volatilityService = { computeForProduct } as unknown as VolatilityService;

      const service = new VolatilityRollupService(catalogRepo, volatilityService, makeChangeRepo());
      const result = await service.getCanonicalVolatility("canonical-1");
      expect(result?.productsScored).toBe(0);
      expect(result?.score).toBe(0);
    });
  });

  describe("getMerchantAggressiveness", () => {
    function change(overrides: Partial<MarketChange> = {}): MarketChange {
      return {
        id: "c1",
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
        detectedAt: new Date().toISOString(),
        ...overrides,
      };
    }

    it("computes the fraction of price changes that were decreases", async () => {
      const changes = [change({ changeType: ChangeType.PriceDecreased }), change({ changeType: ChangeType.PriceDecreased }), change({ changeType: ChangeType.PriceIncreased })];
      const changeRepo = makeChangeRepo({ listForStore: jest.fn().mockResolvedValue(changes) });
      const catalogRepo = makeCatalogRepo();
      const volatilityService = {} as VolatilityService;

      const service = new VolatilityRollupService(catalogRepo, volatilityService, changeRepo);
      const result = await service.getMerchantAggressiveness("store-1");

      expect(result.priceChangeCount).toBe(3);
      expect(result.priceDropShare).toBeCloseTo(2 / 3);
    });

    it("returns zero share when there are no price changes in the window", async () => {
      const changeRepo = makeChangeRepo({ listForStore: jest.fn().mockResolvedValue([]) });
      const service = new VolatilityRollupService(makeCatalogRepo(), {} as VolatilityService, changeRepo);
      const result = await service.getMerchantAggressiveness("store-1");
      expect(result.priceDropShare).toBe(0);
      expect(result.priceChangeCount).toBe(0);
    });

    it("ignores non-price change types when computing aggressiveness", async () => {
      const changes = [change({ changeType: ChangeType.ImageChanged }), change({ changeType: ChangeType.StockOut })];
      const changeRepo = makeChangeRepo({ listForStore: jest.fn().mockResolvedValue(changes) });
      const service = new VolatilityRollupService(makeCatalogRepo(), {} as VolatilityService, changeRepo);
      const result = await service.getMerchantAggressiveness("store-1");
      expect(result.priceChangeCount).toBe(0);
    });
  });

  describe("getCategoryVolatility", () => {
    it("averages canonical volatility scores across the category's canonical products", async () => {
      const products: CanonicalProduct[] = [
        { id: "c1", canonicalSlug: "a", name: "A", brandId: null, categoryId: "cat-1", imageUrl: null, specifications: null, createdAt: "", updatedAt: "", isActive: true, mergedIntoId: null },
        { id: "c2", canonicalSlug: "b", name: "B", brandId: null, categoryId: "cat-1", imageUrl: null, specifications: null, createdAt: "", updatedAt: "", isActive: true, mergedIntoId: null },
      ];

      const findOffersByCanonicalProductId = jest.fn().mockImplementation((canonicalProductId: string) => {
        const productId = canonicalProductId === "c1" ? "p1" : "p2";
        return Promise.resolve({
          items: [{ offerId: "o", productId, storeId: "s", storeSlug: "s", priceUSD: 1, inStock: true, stockQuantity: null, updatedAt: "", condition: null, warranty: null, productUrl: null }],
          total: 1,
        });
      });

      const catalogRepo = makeCatalogRepo({
        findByCategoryId: jest.fn().mockResolvedValue(products),
        findOffersByCanonicalProductId,
      });

      const computeForProduct = jest.fn().mockImplementation((productId: string) =>
        Promise.resolve({ productId, score: productId === "p1" ? 20 : 60, classification: VolatilityClass.Estavel, factors: {}, sampleSize: 5, windowDays: 30, computedAt: "" })
      );
      const volatilityService = { computeForProduct } as unknown as VolatilityService;

      const service = new VolatilityRollupService(catalogRepo, volatilityService, makeChangeRepo());
      const result = await service.getCategoryVolatility("cat-1");

      expect(result.canonicalProductsScored).toBe(2);
      expect(result.averageScore).toBe(40);
    });
  });
});
