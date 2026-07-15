import { OpportunityEngine } from "../services/OpportunityEngine";
import type { ComparisonIntelligenceComposer } from "../services/ComparisonIntelligenceComposer";
import type { PurchaseTimingComposer } from "../services/PurchaseTimingComposer";
import type { ICanonicalCatalogRepository, CanonicalProduct, CanonicalOfferView } from "@/src/domains/canonical-catalog";
import type { PriceIntelligenceService, SavingsOpportunity } from "@/src/domains/market-insights";
import type { FreshnessService } from "@/src/domains/realtime-commerce";
import { FreshnessClass } from "@/src/domains/realtime-commerce";
import type { IMerchantStoreLinkRepository } from "@/src/domains/merchant-ownership/repositories/IMerchantStoreLinkRepository";
import type { BadgeService } from "@/src/domains/trust/services/BadgeService";
import type { IAnalyticsEventRepository } from "@/src/domains/merchant-analytics/repositories/IAnalyticsEventRepository";
import { AnalyticsEventType } from "@/src/domains/merchant-analytics/types/enums";
import type { MerchantBadgeRecord } from "@/src/domains/trust/types/trust.types";

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
    isActive: true,
    mergedIntoId: null,
    ...overrides,
  };
}

function makeOffer(overrides: Partial<CanonicalOfferView> = {}): CanonicalOfferView {
  return {
    offerId: "offer-1",
    productId: "product-1",
    storeId: "store-1",
    storeSlug: "store-1",
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

function makeSavings(overrides: Partial<SavingsOpportunity> = {}): SavingsOpportunity {
  return {
    canonicalProductId: "canonical-1",
    cheapestStoreId: "store-1",
    cheapestStoreSlug: "store-1",
    cheapestPriceUSD: 90,
    mostExpensiveStoreId: "store-2",
    mostExpensiveStoreSlug: "store-2",
    mostExpensivePriceUSD: 120,
    maxSavingsUSD: 30,
    maxSavingsPercent: 25,
    ...overrides,
  };
}

function makeCatalogRepo(products: CanonicalProduct[], offersByProductId: Record<string, CanonicalOfferView[]>): ICanonicalCatalogRepository {
  return {
    findAll: jest.fn().mockResolvedValue({ items: products, total: products.length }),
    findOffersByCanonicalProductId: jest.fn().mockImplementation(async (id: string) => ({
      items: offersByProductId[id] ?? [],
      total: (offersByProductId[id] ?? []).length,
    })),
    findBySlug: jest.fn(),
    findById: jest.fn(),
    findCanonicalProductIdByProductId: jest.fn(),
  } as unknown as ICanonicalCatalogRepository;
}

function makePriceIntelligenceService(savingsByProductId: Record<string, SavingsOpportunity | null>): PriceIntelligenceService {
  return {
    getSavingsOpportunity: jest.fn().mockImplementation(async (id: string) => savingsByProductId[id] ?? null),
  } as unknown as PriceIntelligenceService;
}

function makeFreshnessService(classification: FreshnessClass = FreshnessClass.Live): FreshnessService {
  return {
    computeForOffer: jest.fn().mockResolvedValue({ offerId: "offer-1", score: 100, classification, ageSeconds: 10, lastChangeAt: null }),
  } as unknown as FreshnessService;
}

function makeLinkRepo(merchantIdByStoreId: Record<string, string> = {}): IMerchantStoreLinkRepository {
  return {
    findMerchantIdsByStoreIds: jest.fn().mockImplementation(async (storeIds: string[]) => {
      const map = new Map<string, string>();
      for (const storeId of storeIds) if (merchantIdByStoreId[storeId]) map.set(storeId, merchantIdByStoreId[storeId]);
      return map;
    }),
  } as unknown as IMerchantStoreLinkRepository;
}

function makeBadgeService(activeBadgesByMerchantId: Map<string, MerchantBadgeRecord> = new Map()): BadgeService {
  return { getActiveBadges: jest.fn().mockResolvedValue(activeBadgesByMerchantId) } as unknown as BadgeService;
}

function makeComparisonComposer(bundle: unknown = { priceAggregation: { trend: "stable" } }): ComparisonIntelligenceComposer {
  return { composeForSlug: jest.fn().mockResolvedValue(bundle) } as unknown as ComparisonIntelligenceComposer;
}

function makePurchaseTimingComposer(verdict: string = "can_wait"): PurchaseTimingComposer {
  return { compose: jest.fn().mockResolvedValue({ verdict }) } as unknown as PurchaseTimingComposer;
}

function makeAnalyticsEventRepository(clicksByProductId: Record<string, number> = {}): IAnalyticsEventRepository {
  return {
    findByProduct: jest.fn().mockImplementation(async (productId: string) => {
      const count = clicksByProductId[productId] ?? 0;
      return Array.from({ length: count }, () => ({ event_type: AnalyticsEventType.ProductClicked })) as never;
    }),
  } as unknown as IAnalyticsEventRepository;
}

function buildEngine(opts: {
  products: CanonicalProduct[];
  offersByProductId: Record<string, CanonicalOfferView[]>;
  savingsByProductId: Record<string, SavingsOpportunity | null>;
  freshness?: FreshnessClass;
  verdict?: string;
  merchantIdByStoreId?: Record<string, string>;
  activeBadges?: Map<string, MerchantBadgeRecord>;
  clicksByProductId?: Record<string, number>;
}): OpportunityEngine {
  return new OpportunityEngine(
    makeCatalogRepo(opts.products, opts.offersByProductId),
    makePriceIntelligenceService(opts.savingsByProductId),
    makeFreshnessService(opts.freshness),
    makeLinkRepo(opts.merchantIdByStoreId),
    makeBadgeService(opts.activeBadges),
    makeComparisonComposer(),
    makePurchaseTimingComposer(opts.verdict),
    makeAnalyticsEventRepository(opts.clicksByProductId)
  );
}

describe("OpportunityEngine", () => {
  it("eliminates a candidate whose winning offer is out of stock, even with a huge percent discount", async () => {
    const product = makeCanonicalProduct();
    const offer = makeOffer({ inStock: false });
    const engine = buildEngine({
      products: [product],
      offersByProductId: { "canonical-1": [offer] },
      savingsByProductId: { "canonical-1": makeSavings({ maxSavingsPercent: 90 }) },
    });

    const result = await engine.getTopOpportunities(5);
    expect(result).toHaveLength(0);
  });

  it("eliminates a candidate with a stale/old price", async () => {
    const product = makeCanonicalProduct();
    const offer = makeOffer();
    const engine = buildEngine({
      products: [product],
      offersByProductId: { "canonical-1": [offer] },
      savingsByProductId: { "canonical-1": makeSavings() },
      freshness: FreshnessClass.Stale,
    });

    const result = await engine.getTopOpportunities(5);
    expect(result).toHaveLength(0);
  });

  it("eliminates a candidate only when BOTH savings floors fail — not when just one is low", async () => {
    const bothLow = makeCanonicalProduct();
    const engineBothLow = buildEngine({
      products: [bothLow],
      offersByProductId: { "canonical-1": [makeOffer()] },
      savingsByProductId: { "canonical-1": makeSavings({ maxSavingsUSD: 1, maxSavingsPercent: 1 }) },
    });
    expect(await engineBothLow.getTopOpportunities(5)).toHaveLength(0);

    // Regression: a real production bug — a product with a large absolute
    // discount (US$ 19) but a low percent (1.7%, below a percent-only floor)
    // must still survive, because Objetivo 4/6 explicitly wants absolute
    // savings to be able to win on its own.
    const highAbsoluteLowPercent = makeCanonicalProduct({ id: "canonical-2", canonicalSlug: "product-2" });
    const engineHighAbsolute = buildEngine({
      products: [highAbsoluteLowPercent],
      offersByProductId: { "canonical-2": [makeOffer({ storeId: "store-2" })] },
      savingsByProductId: { "canonical-2": makeSavings({ cheapestStoreId: "store-2", maxSavingsUSD: 19, maxSavingsPercent: 1.7 }) },
    });
    expect(await engineHighAbsolute.getTopOpportunities(5)).toHaveLength(1);

    // Symmetric case: low absolute but high percent must also survive.
    const lowAbsoluteHighPercent = makeCanonicalProduct({ id: "canonical-3", canonicalSlug: "product-3" });
    const engineHighPercent = buildEngine({
      products: [lowAbsoluteHighPercent],
      offersByProductId: { "canonical-3": [makeOffer({ storeId: "store-3" })] },
      savingsByProductId: { "canonical-3": makeSavings({ cheapestStoreId: "store-3", maxSavingsUSD: 2, maxSavingsPercent: 50 }) },
    });
    expect(await engineHighPercent.getTopOpportunities(5)).toHaveLength(1);
  });

  it("eliminates a candidate whose Purchase Timing verdict is better_wait — a real discount that is not a real opportunity", async () => {
    const product = makeCanonicalProduct();
    const offer = makeOffer();
    const engine = buildEngine({
      products: [product],
      offersByProductId: { "canonical-1": [offer] },
      savingsByProductId: { "canonical-1": makeSavings({ maxSavingsPercent: 40 }) },
      verdict: "better_wait",
    });

    const result = await engine.getTopOpportunities(5);
    expect(result).toHaveLength(0);
  });

  it("ranks by absolute savings (USD), not percent — 'maior desconto' does not automatically win", async () => {
    const bigPercentSmallUSD = makeCanonicalProduct({ id: "canonical-a", canonicalSlug: "product-a", name: "Produto A" });
    const smallPercentBigUSD = makeCanonicalProduct({ id: "canonical-b", canonicalSlug: "product-b", name: "Produto B" });

    const offerA = makeOffer({ offerId: "offer-a", productId: "product-a", storeId: "store-a" });
    const offerB = makeOffer({ offerId: "offer-b", productId: "product-b", storeId: "store-b" });

    const engine = buildEngine({
      products: [bigPercentSmallUSD, smallPercentBigUSD],
      offersByProductId: { "canonical-a": [offerA], "canonical-b": [offerB] },
      savingsByProductId: {
        "canonical-a": makeSavings({ cheapestStoreId: "store-a", maxSavingsUSD: 5, maxSavingsPercent: 90 }),
        "canonical-b": makeSavings({ cheapestStoreId: "store-b", maxSavingsUSD: 500, maxSavingsPercent: 15 }),
      },
    });

    const result = await engine.getTopOpportunities(5);
    expect(result[0].canonicalProductId).toBe("canonical-b");
    expect(result[0].savingsUSD).toBe(500);
  });

  it("breaks a tie in absolute savings by percent, then by popularity", async () => {
    const productA = makeCanonicalProduct({ id: "canonical-a", canonicalSlug: "product-a", name: "Produto A" });
    const productB = makeCanonicalProduct({ id: "canonical-b", canonicalSlug: "product-b", name: "Produto B" });

    const offerA = makeOffer({ offerId: "offer-a", productId: "product-a", storeId: "store-a" });
    const offerB = makeOffer({ offerId: "offer-b", productId: "product-b", storeId: "store-b" });

    const engine = buildEngine({
      products: [productA, productB],
      offersByProductId: { "canonical-a": [offerA], "canonical-b": [offerB] },
      savingsByProductId: {
        "canonical-a": makeSavings({ cheapestStoreId: "store-a", maxSavingsUSD: 100, maxSavingsPercent: 20 }),
        "canonical-b": makeSavings({ cheapestStoreId: "store-b", maxSavingsUSD: 100, maxSavingsPercent: 30 }),
      },
    });

    const result = await engine.getTopOpportunities(5);
    expect(result[0].canonicalProductId).toBe("canonical-b"); // higher percent wins the tie
  });

  it("reads isVerifiedStore but never eliminates on it — an unverified store still wins on savings", async () => {
    const product = makeCanonicalProduct();
    const offer = makeOffer();
    const engine = buildEngine({
      products: [product],
      offersByProductId: { "canonical-1": [offer] },
      savingsByProductId: { "canonical-1": makeSavings() },
      merchantIdByStoreId: {}, // no merchant linked — isVerifiedStore should be false, not eliminating
    });

    const result = await engine.getTopOpportunities(5);
    expect(result).toHaveLength(1);
    expect(result[0].isVerifiedStore).toBe(false);
  });

  it("isolates a per-candidate failure instead of failing the whole batch", async () => {
    const goodProduct = makeCanonicalProduct({ id: "canonical-good", canonicalSlug: "good", name: "Bom" });
    const brokenProduct = makeCanonicalProduct({ id: "canonical-broken", canonicalSlug: "broken", name: "Quebrado" });
    const goodOffer = makeOffer({ offerId: "offer-good", productId: "product-good", storeId: "store-good" });

    const priceIntelligenceService = {
      getSavingsOpportunity: jest.fn().mockImplementation(async (id: string) => {
        if (id === "canonical-broken") throw new Error("boom");
        return makeSavings({ cheapestStoreId: "store-good" });
      }),
    } as unknown as PriceIntelligenceService;

    const engine = new OpportunityEngine(
      makeCatalogRepo([goodProduct, brokenProduct], { "canonical-good": [goodOffer], "canonical-broken": [] }),
      priceIntelligenceService,
      makeFreshnessService(),
      makeLinkRepo(),
      makeBadgeService(),
      makeComparisonComposer(),
      makePurchaseTimingComposer(),
      makeAnalyticsEventRepository()
    );

    const result = await engine.getTopOpportunities(5);
    expect(result).toHaveLength(1);
    expect(result[0].canonicalProductId).toBe("canonical-good");
  });
});
