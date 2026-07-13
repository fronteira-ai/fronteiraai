import { MarketPulseInsightsService } from "../services/MarketPulseInsightsService";
import { ChangeType } from "@/src/domains/realtime-commerce";
import type { MarketPulseService, TopMover } from "@/src/domains/realtime-commerce";
import type { ICanonicalCatalogRepository, CanonicalProduct } from "@/src/domains/canonical-catalog";

function mover(overrides: Partial<TopMover> = {}): TopMover {
  return {
    productId: "p1",
    productName: "Raw Product Name",
    storeId: "s1",
    storeName: "Store 1",
    previousValue: "100",
    currentValue: "80",
    percentChange: -0.2,
    changeType: ChangeType.PriceDecreased,
    detectedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeCatalogRepo(overrides: Partial<ICanonicalCatalogRepository> = {}): ICanonicalCatalogRepository {
  return {
    findBySlug: jest.fn(),
    findById: jest.fn(),
    findOrCreateBySlug: jest.fn(),
    updateSyncedFields: jest.fn(),
    findByBrandId: jest.fn(),
    findByCategoryId: jest.fn(),
    findCanonicalProductIdByProductId: jest.fn(),
    findAll: jest.fn(),
    linkOffer: jest.fn(),
    findOffersByCanonicalProductId: jest.fn(),
    ...overrides,
  };
}

describe("MarketPulseInsightsService", () => {
  it("excludes raw movers that aren't linked to a canonical product yet", async () => {
    const getTopMovers = jest.fn().mockResolvedValue([mover({ productId: "p1" })]);
    const marketPulseService = { getTopMovers } as unknown as MarketPulseService;
    const catalogRepo = makeCatalogRepo({ findCanonicalProductIdByProductId: jest.fn().mockResolvedValue(null) });

    const service = new MarketPulseInsightsService(marketPulseService, catalogRepo);
    const result = await service.getCanonicalMarketMovers(new Date(), new Date());
    expect(result).toEqual([]);
  });

  it("dedupes two raw movers linked to the same canonical product, keeping the bigger move", async () => {
    const getTopMovers = jest.fn().mockResolvedValue([
      mover({ productId: "p1", percentChange: -0.1 }),
      mover({ productId: "p2", percentChange: -0.3, storeId: "s2", storeName: "Store 2" }),
    ]);
    const marketPulseService = { getTopMovers } as unknown as MarketPulseService;

    const canonicalProduct: CanonicalProduct = {
      id: "canonical-1",
      canonicalSlug: "slug",
      name: "Canonical Name",
      brandId: null,
      categoryId: null,
      imageUrl: null,
      specifications: null,
      createdAt: "",
      updatedAt: "",
    };

    const catalogRepo = makeCatalogRepo({
      findCanonicalProductIdByProductId: jest.fn().mockResolvedValue("canonical-1"),
      findById: jest.fn().mockResolvedValue(canonicalProduct),
    });

    const service = new MarketPulseInsightsService(marketPulseService, catalogRepo);
    const result = await service.getCanonicalMarketMovers(new Date(), new Date());

    expect(result).toHaveLength(1);
    expect(result[0].percentChange).toBe(-0.3);
    expect(result[0].productName).toBe("Canonical Name");
  });

  it("returns an empty array when there are no raw movers at all", async () => {
    const marketPulseService = { getTopMovers: jest.fn().mockResolvedValue([]) } as unknown as MarketPulseService;
    const service = new MarketPulseInsightsService(marketPulseService, makeCatalogRepo());
    expect(await service.getCanonicalMarketMovers(new Date(), new Date())).toEqual([]);
  });
});
