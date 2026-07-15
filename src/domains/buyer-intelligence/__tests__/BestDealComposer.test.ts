import { BestDealComposer } from "../services/BestDealComposer";
import type { ComparisonIntelligenceBundle, RankedOfferIntelligence } from "../types/buyer-intelligence.types";
import type { ExchangeRateService } from "@/src/domains/exchange";
import { CurrencyPair } from "@/src/domains/exchange";
import { FreshnessClass } from "@/src/domains/realtime-commerce";
import type { CanonicalProduct, CanonicalOfferView } from "@/src/domains/canonical-catalog";

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
    isActive: true,
    mergedIntoId: null,
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

function makeRanked(overrides: Partial<RankedOfferIntelligence> = {}): RankedOfferIntelligence {
  return {
    offer: makeOffer(),
    rank: 1,
    rankScore: 90,
    factors: [
      { factor: "price", weight: 40, evidence: "USD 100 vs. lowest USD 100 among compared offers" },
      { factor: "availability", weight: 20, evidence: "in stock" },
      { factor: "recency", weight: 15, evidence: "last updated 0.1 day(s) ago" },
      { factor: "trust", weight: 15, evidence: "store is verified" },
      { factor: "listing-quality", weight: 10, evidence: "3/3 listing fields filled" },
    ],
    isVerifiedStore: true,
    freshness: { offerId: "offer-1", score: 100, classification: FreshnessClass.Live, ageSeconds: 10, lastChangeAt: null },
    ...overrides,
  };
}

function makeBundle(overrides: Partial<ComparisonIntelligenceBundle> = {}): ComparisonIntelligenceBundle {
  return {
    canonicalProduct: makeCanonicalProduct(),
    offers: [makeRanked()],
    totalOffers: 1,
    priceAggregation: {
      lowestPriceUSD: 100,
      highestPriceUSD: 100,
      averagePriceUSD: 100,
      lastPriceUSD: 100,
      variationPercent: 0,
      trend: "stable",
      lastUpdatedAt: null,
      firstSeenAt: null,
    },
    priceStatistics: null,
    savingsOpportunity: null,
    errors: {},
    ...overrides,
  };
}

function makeExchangeService(overrides: Partial<ExchangeRateService> = {}): ExchangeRateService {
  return {
    getCurrentRate: jest.fn().mockResolvedValue({ pair: CurrencyPair.UsdBrl, rate: 5.4, source: "test", capturedAt: "2026-07-13T00:00:00Z" }),
    ...overrides,
  } as unknown as ExchangeRateService;
}

describe("BestDealComposer", () => {
  it("returns null when there's no rank-1 offer (empty comparison)", async () => {
    const bundle = makeBundle({ offers: [], totalOffers: 0 });
    const composer = new BestDealComposer(makeExchangeService());

    const result = await composer.compose(bundle);
    expect(result).toBeNull();
  });

  it("builds reasons directly from the existing OfferRankingService factors, never inventing a new one", async () => {
    const bundle = makeBundle();
    const composer = new BestDealComposer(makeExchangeService());

    const result = await composer.compose(bundle);
    expect(result).not.toBeNull();

    const factorNames = result!.reasons.map((r) => r.factor);
    expect(factorNames).toEqual(expect.arrayContaining(["price", "availability", "recency", "trust", "listing-quality", "freshness", "rank"]));
    // Every reason's evidence traces back to something already in the input.
    const priceReason = result!.reasons.find((r) => r.factor === "price")!;
    expect(priceReason.evidence).toBe("USD 100 vs. lowest USD 100 among compared offers");
  });

  it("includes a savings reason only for the cheapest store, sourced from SavingsOpportunity", async () => {
    const bundle = makeBundle({
      savingsOpportunity: {
        canonicalProductId: "canonical-1",
        cheapestStoreId: "store-1",
        cheapestStoreSlug: "store-1",
        cheapestPriceUSD: 80,
        mostExpensiveStoreId: "store-2",
        mostExpensiveStoreSlug: "store-2",
        mostExpensivePriceUSD: 100,
        maxSavingsUSD: 20,
        maxSavingsPercent: 20,
      },
    });
    const composer = new BestDealComposer(makeExchangeService());

    const result = await composer.compose(bundle);
    const savingsReason = result!.reasons.find((r) => r.factor === "savings");
    expect(savingsReason).toBeDefined();
    expect(savingsReason!.evidence).toContain("20.00");
  });

  it("fetches the current USD/BRL exchange rate for context, without altering any price", async () => {
    const bundle = makeBundle();
    const rate = { pair: CurrencyPair.UsdBrl, rate: 5.42, source: "test-provider", capturedAt: "2026-07-13T10:00:00Z" };
    const composer = new BestDealComposer(makeExchangeService({ getCurrentRate: jest.fn().mockResolvedValue(rate) }));

    const result = await composer.compose(bundle);
    expect(result!.exchangeContext).toEqual({ rate });
    // Price itself is untouched — still exactly what the offer carried.
    expect(result!.recommendedOffer.offer.priceUSD).toBe(100);
  });

  it("isolates an exchange rate failure instead of failing the whole result", async () => {
    const bundle = makeBundle();
    const composer = new BestDealComposer(makeExchangeService({ getCurrentRate: jest.fn().mockRejectedValue(new Error("provider down")) }));

    const result = await composer.compose(bundle);
    expect(result).not.toBeNull();
    expect(result!.exchangeContext).toBeNull();
    expect(result!.errors.exchangeRate).toBe("provider down");
  });

  describe("near-tie detection (Objetivo 6)", () => {
    it("flags two offers within the rankScore gap threshold as a near tie", async () => {
      const first = makeRanked({ rank: 1, rankScore: 88, offer: makeOffer({ offerId: "a", storeId: "store-1" }) });
      const second = makeRanked({ rank: 2, rankScore: 85, offer: makeOffer({ offerId: "b", storeId: "store-2" }) });
      const bundle = makeBundle({ offers: [first, second], totalOffers: 2 });
      const composer = new BestDealComposer(makeExchangeService());

      const result = await composer.compose(bundle);
      expect(result!.nearTie).not.toBeNull();
      expect(result!.nearTie!.isNearTie).toBe(true);
      expect(result!.nearTie!.contenders).toHaveLength(2);
    });

    it("does not flag a near tie when the rankScore gap is large", async () => {
      const first = makeRanked({ rank: 1, rankScore: 90, offer: makeOffer({ offerId: "a", storeId: "store-1" }) });
      const second = makeRanked({ rank: 2, rankScore: 40, offer: makeOffer({ offerId: "b", storeId: "store-2" }) });
      const bundle = makeBundle({ offers: [first, second], totalOffers: 2 });
      const composer = new BestDealComposer(makeExchangeService());

      const result = await composer.compose(bundle);
      expect(result!.nearTie).toBeNull();
    });

    it("names the factor with the largest weight gap as the differentiator", async () => {
      const first = makeRanked({
        rank: 1,
        rankScore: 88,
        offer: makeOffer({ offerId: "a", storeId: "store-1" }),
        factors: [
          { factor: "price", weight: 40, evidence: "cheapest" },
          { factor: "trust", weight: 15, evidence: "store is verified" },
        ],
      });
      const second = makeRanked({
        rank: 2,
        rankScore: 85,
        offer: makeOffer({ offerId: "b", storeId: "store-2" }),
        factors: [
          { factor: "price", weight: 40, evidence: "same price" },
          { factor: "trust", weight: 0, evidence: "store is not verified" },
        ],
      });
      const bundle = makeBundle({ offers: [first, second], totalOffers: 2 });
      const composer = new BestDealComposer(makeExchangeService());

      const result = await composer.compose(bundle);
      expect(result!.nearTie!.differentiatingFactor!.factor).toBe("trust");
    });

    it("is null when there's no second offer to compare against", async () => {
      const bundle = makeBundle();
      const composer = new BestDealComposer(makeExchangeService());

      const result = await composer.compose(bundle);
      expect(result!.nearTie).toBeNull();
    });
  });
});
