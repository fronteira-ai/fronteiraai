import { PriceHistoryQueryService } from "../services/PriceHistoryQueryService";
import { CanonicalPriceHistoryService, type ICanonicalCatalogRepository } from "@/src/domains/canonical-catalog";
import type { VolatilityRollupService } from "../services/VolatilityRollupService";
import type { IMarketChangeRepository, MarketChange } from "@/src/domains/realtime-commerce";
import { ChangeType } from "@/src/domains/realtime-commerce";

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
    findOffersByCanonicalProductId: jest.fn().mockResolvedValue({
      items: [
        { offerId: "o1", productId: "p1", storeId: "s1", storeSlug: "s1", priceUSD: 90, inStock: true, stockQuantity: null, updatedAt: "", condition: null, warranty: null, productUrl: null },
      ],
      total: 1,
    }),
    findOfferIdsByCanonicalProductId: jest.fn(),
    reassignOffers: jest.fn(),
    reassignOffersByIds: jest.fn(),
    deactivateAndMerge: jest.fn(),
    reactivate: jest.fn(),
    ...overrides,
  };
}

function makeChange(overrides: Partial<MarketChange> = {}): MarketChange {
  return {
    id: "c1",
    changeType: ChangeType.PriceDecreased,
    entityType: "offer" as MarketChange["entityType"],
    entityId: "o1",
    productId: "p1",
    storeId: "s1",
    field: "price_usd",
    previousValue: "100",
    currentValue: "90",
    confidence: 1,
    source: "crawler",
    detectedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("PriceHistoryQueryService", () => {
  it("returns null when there is no price data at all for the canonical product", async () => {
    const catalogRepo = makeCatalogRepo({ findOffersByCanonicalProductId: jest.fn().mockResolvedValue({ items: [], total: 0 }) });
    const priceHistoryService = new CanonicalPriceHistoryService({ findByCanonicalProductId: jest.fn().mockResolvedValue([]) });
    const volatilityRollup = { getCanonicalVolatility: jest.fn() } as unknown as VolatilityRollupService;
    const changeRepo = { listForProduct: jest.fn() } as unknown as IMarketChangeRepository;

    const service = new PriceHistoryQueryService(catalogRepo, priceHistoryService, volatilityRollup, changeRepo);
    expect(await service.getProfile("canonical-1")).toBeNull();
  });

  it("computes change frequency per week from market_changes across every linked raw product", async () => {
    const catalogRepo = makeCatalogRepo();
    const priceHistoryService = new CanonicalPriceHistoryService({
      findByCanonicalProductId: jest.fn().mockResolvedValue([{ offerId: "o1", priceUSD: 100, recordedAt: "2026-06-01T00:00:00Z" }]),
    });
    const volatilityRollup = {
      getCanonicalVolatility: jest.fn().mockResolvedValue({ canonicalProductId: "canonical-1", score: 30, classification: "estavel", productsScored: 1 }),
    } as unknown as VolatilityRollupService;
    const changeRepo = {
      listForProduct: jest.fn().mockResolvedValue([makeChange(), makeChange({ changeType: ChangeType.PriceIncreased })]),
    } as unknown as IMarketChangeRepository;

    const service = new PriceHistoryQueryService(catalogRepo, priceHistoryService, volatilityRollup, changeRepo);
    const profile = await service.getProfile("canonical-1", 14); // 2-week window

    expect(profile?.changeFrequencyPerWeek).toBeCloseTo(1); // 2 changes / 2 weeks
    expect(profile?.stabilityScore).toBe(70); // 100 - 30
    expect(profile?.lastPriceUSD).toBe(90); // live offer price wins over history
  });

  it("reports stabilityScore as null when volatility can't be computed yet", async () => {
    const catalogRepo = makeCatalogRepo();
    const priceHistoryService = new CanonicalPriceHistoryService({
      findByCanonicalProductId: jest.fn().mockResolvedValue([{ offerId: "o1", priceUSD: 100, recordedAt: "2026-06-01T00:00:00Z" }]),
    });
    const volatilityRollup = {
      getCanonicalVolatility: jest.fn().mockResolvedValue({ canonicalProductId: "canonical-1", score: 0, classification: "estavel", productsScored: 0 }),
    } as unknown as VolatilityRollupService;
    const changeRepo = { listForProduct: jest.fn().mockResolvedValue([]) } as unknown as IMarketChangeRepository;

    const service = new PriceHistoryQueryService(catalogRepo, priceHistoryService, volatilityRollup, changeRepo);
    const profile = await service.getProfile("canonical-1");
    expect(profile?.stabilityScore).toBeNull();
  });
});
