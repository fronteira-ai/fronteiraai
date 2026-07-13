import { ComparisonIntelligenceComposer } from "../services/ComparisonIntelligenceComposer";
import { ProductIntelligenceComposer } from "../services/ProductIntelligenceComposer";
import { CanonicalProductService, OfferRankingService, CanonicalPriceHistoryService, CompareFoundationService } from "@/src/domains/canonical-catalog";
import type { ICanonicalCatalogRepository, ICanonicalPriceHistoryRepository, CanonicalProduct, CanonicalOfferView } from "@/src/domains/canonical-catalog";
import { PriceIntelligenceService } from "@/src/domains/market-insights";
import { FreshnessService } from "@/src/domains/realtime-commerce";
import type { IMarketChangeRepository } from "@/src/domains/realtime-commerce";
import { BadgeService } from "@/src/domains/trust/services/BadgeService";
import type { IBadgeRepository, ITrustEventRepository } from "@/src/domains/trust/repositories";
import { TrustBadge } from "@/src/domains/trust/types/enums";
import type { ITrustRepository } from "@/src/domains/trust/repositories/ITrustRepository";
import type { MerchantBadgeRecord } from "@/src/domains/trust/types/trust.types";
import type { IMerchantStoreLinkRepository } from "@/src/domains/merchant-ownership/repositories/IMerchantStoreLinkRepository";

function makeCanonicalProduct(overrides: Partial<CanonicalProduct> = {}): CanonicalProduct {
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
    ...overrides,
  };
}

function makeOffer(overrides: Partial<CanonicalOfferView> = {}): CanonicalOfferView {
  return {
    offerId: "offer-1",
    productId: "product-1",
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

function makeCatalogRepo(overrides: Partial<ICanonicalCatalogRepository> = {}): ICanonicalCatalogRepository {
  return {
    findBySlug: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
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

function makeBadgeRepo(activeBadgesByMerchantId: Map<string, MerchantBadgeRecord> = new Map()): IBadgeRepository {
  return {
    findByMerchantId: jest.fn().mockResolvedValue([]),
    findActiveBadge: jest.fn().mockResolvedValue(null),
    findActiveBadgesByMerchantIds: jest.fn().mockResolvedValue(activeBadgesByMerchantId),
    grant: jest.fn(),
    revoke: jest.fn(),
    deactivateAll: jest.fn(),
  };
}

function makeTrustRepo(): ITrustRepository {
  return {
    findByMerchantId: jest.fn().mockResolvedValue(null),
    findAll: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    updateBadge: jest.fn(),
    touch: jest.fn(),
  };
}

function makeTrustEventRepo(): ITrustEventRepository {
  return {
    findByMerchantId: jest.fn().mockResolvedValue([]),
    findByType: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
  };
}

function makeStoreLinkRepo(merchantIdByStoreId: Map<string, string> = new Map()): IMerchantStoreLinkRepository {
  return {
    link: jest.fn(),
    unlink: jest.fn(),
    isLinked: jest.fn().mockResolvedValue(false),
    findMerchantIdsByStoreIds: jest.fn().mockResolvedValue(merchantIdByStoreId),
  };
}

function makeChangeRepo(): IMarketChangeRepository {
  return {
    insertMany: jest.fn(),
    countInRange: jest.fn(),
    listInRange: jest.fn(),
    latestForEntity: jest.fn().mockResolvedValue(null),
    listForProduct: jest.fn(),
    listForStore: jest.fn(),
  };
}

function makePriceHistoryRepo(): ICanonicalPriceHistoryRepository {
  return { findByCanonicalProductId: jest.fn().mockResolvedValue([]) };
}

describe("ComparisonIntelligenceComposer", () => {
  it("returns null when the canonical slug doesn't resolve", async () => {
    const catalogRepo = makeCatalogRepo();
    const compareFoundationService = new CompareFoundationService(
      new CanonicalProductService(catalogRepo),
      catalogRepo,
      new OfferRankingService(),
      new CanonicalPriceHistoryService(makePriceHistoryRepo())
    );
    const composer = new ComparisonIntelligenceComposer(
      compareFoundationService,
      catalogRepo,
      new PriceIntelligenceService(catalogRepo),
      new FreshnessService(makeChangeRepo()),
      makeStoreLinkRepo(),
      new BadgeService(makeBadgeRepo(), makeTrustRepo(), makeTrustEventRepo())
    );

    const result = await composer.composeForSlug("does-not-exist");
    expect(result).toBeNull();
  });

  it("composes ranked offers, verification, freshness, price statistics and savings from real offers", async () => {
    const canonicalProduct = makeCanonicalProduct();
    const offers = [
      makeOffer({ offerId: "a", storeId: "store-1", priceUSD: 100 }),
      makeOffer({ offerId: "b", storeId: "store-2", priceUSD: 80 }),
    ];
    const catalogRepo = makeCatalogRepo({
      findBySlug: jest.fn().mockResolvedValue(canonicalProduct),
      findOffersByCanonicalProductId: jest.fn().mockResolvedValue({ items: offers, total: 2 }),
    });

    const compareFoundationService = new CompareFoundationService(
      new CanonicalProductService(catalogRepo),
      catalogRepo,
      new OfferRankingService(),
      new CanonicalPriceHistoryService(makePriceHistoryRepo())
    );

    const badge: MerchantBadgeRecord = {
      id: "badge-1",
      merchant_id: "merchant-2",
      badge_type: TrustBadge.Verified,
      granted_at: "2026-07-01T00:00:00Z",
      expires_at: null,
      revoked_at: null,
      revoke_reason: null,
      granted_by: null,
      is_active: true,
      metadata: {},
    };
    const badgeService = new BadgeService(
      makeBadgeRepo(new Map([["merchant-2", badge]])),
      makeTrustRepo(),
      makeTrustEventRepo()
    );
    // Only store-2 is claimed by a merchant with an active badge.
    const storeLinkRepo = makeStoreLinkRepo(new Map([["store-2", "merchant-2"]]));

    const composer = new ComparisonIntelligenceComposer(
      compareFoundationService,
      catalogRepo,
      new PriceIntelligenceService(catalogRepo),
      new FreshnessService(makeChangeRepo()),
      storeLinkRepo,
      badgeService
    );

    const result = await composer.composeForSlug("iphone-15-pro");

    expect(result).not.toBeNull();
    expect(result!.canonicalProduct).toBe(canonicalProduct);
    expect(result!.offers).toHaveLength(2);
    expect(result!.totalOffers).toBe(2);

    const store1Offer = result!.offers.find((o) => o.offer.storeId === "store-1")!;
    const store2Offer = result!.offers.find((o) => o.offer.storeId === "store-2")!;
    expect(store1Offer.isVerifiedStore).toBe(false);
    expect(store2Offer.isVerifiedStore).toBe(true);
    // Cheaper AND verified store should rank first.
    expect(result!.offers[0].offer.storeId).toBe("store-2");

    expect(result!.priceStatistics).not.toBeNull();
    expect(result!.priceStatistics!.lowestPriceUSD).toBe(80);
    expect(result!.savingsOpportunity).not.toBeNull();
    expect(result!.savingsOpportunity!.maxSavingsUSD).toBe(20);
    expect(result!.errors).toEqual({});
  });

  it("isolates a failing sub-call instead of failing the whole bundle", async () => {
    const canonicalProduct = makeCanonicalProduct();
    const offers = [makeOffer({ offerId: "a", storeId: "store-1", priceUSD: 100 })];
    const catalogRepo = makeCatalogRepo({
      findBySlug: jest.fn().mockResolvedValue(canonicalProduct),
      findOffersByCanonicalProductId: jest.fn().mockResolvedValue({ items: offers, total: 1 }),
    });
    const compareFoundationService = new CompareFoundationService(
      new CanonicalProductService(catalogRepo),
      catalogRepo,
      new OfferRankingService(),
      new CanonicalPriceHistoryService(makePriceHistoryRepo())
    );

    const brokenPriceIntelligence = {
      getStatistics: jest.fn().mockRejectedValue(new Error("boom")),
      getSavingsOpportunity: jest.fn().mockResolvedValue(null),
    } as unknown as PriceIntelligenceService;

    const composer = new ComparisonIntelligenceComposer(
      compareFoundationService,
      catalogRepo,
      brokenPriceIntelligence,
      new FreshnessService(makeChangeRepo()),
      makeStoreLinkRepo(),
      new BadgeService(makeBadgeRepo(), makeTrustRepo(), makeTrustEventRepo())
    );

    const result = await composer.composeForSlug("iphone-15-pro");
    expect(result).not.toBeNull();
    expect(result!.priceStatistics).toBeNull();
    expect(result!.errors.priceStatistics).toBe("boom");
    // The rest of the bundle is still populated despite the failure.
    expect(result!.offers).toHaveLength(1);
  });
});

describe("ProductIntelligenceComposer", () => {
  it("returns an empty bundle when the product has no canonical link yet (Shadow Mode)", async () => {
    const catalogRepo = makeCatalogRepo({ findCanonicalProductIdByProductId: jest.fn().mockResolvedValue(null) });
    const compareFoundationService = new CompareFoundationService(
      new CanonicalProductService(catalogRepo),
      catalogRepo,
      new OfferRankingService(),
      new CanonicalPriceHistoryService(makePriceHistoryRepo())
    );
    const comparisonComposer = new ComparisonIntelligenceComposer(
      compareFoundationService,
      catalogRepo,
      new PriceIntelligenceService(catalogRepo),
      new FreshnessService(makeChangeRepo()),
      makeStoreLinkRepo(),
      new BadgeService(makeBadgeRepo(), makeTrustRepo(), makeTrustEventRepo())
    );
    const composer = new ProductIntelligenceComposer(catalogRepo, comparisonComposer);

    const bundle = await composer.composeForProduct("product-without-canonical-link");
    expect(bundle.comparison).toBeNull();
  });

  it("delegates to ComparisonIntelligenceComposer once the canonical link is resolved", async () => {
    const canonicalProduct = makeCanonicalProduct();
    const catalogRepo = makeCatalogRepo({
      findCanonicalProductIdByProductId: jest.fn().mockResolvedValue(canonicalProduct.id),
      findById: jest.fn().mockResolvedValue(canonicalProduct),
      findBySlug: jest.fn().mockResolvedValue(canonicalProduct),
      findOffersByCanonicalProductId: jest.fn().mockResolvedValue({ items: [makeOffer()], total: 1 }),
    });
    const compareFoundationService = new CompareFoundationService(
      new CanonicalProductService(catalogRepo),
      catalogRepo,
      new OfferRankingService(),
      new CanonicalPriceHistoryService(makePriceHistoryRepo())
    );
    const comparisonComposer = new ComparisonIntelligenceComposer(
      compareFoundationService,
      catalogRepo,
      new PriceIntelligenceService(catalogRepo),
      new FreshnessService(makeChangeRepo()),
      makeStoreLinkRepo(),
      new BadgeService(makeBadgeRepo(), makeTrustRepo(), makeTrustEventRepo())
    );
    const composer = new ProductIntelligenceComposer(catalogRepo, comparisonComposer);

    const bundle = await composer.composeForProduct("product-1");
    expect(bundle.comparison).not.toBeNull();
    expect(bundle.comparison!.canonicalProduct).toBe(canonicalProduct);
  });
});
