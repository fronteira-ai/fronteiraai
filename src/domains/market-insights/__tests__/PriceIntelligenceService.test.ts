import { computePriceStatistics, computeSavingsOpportunity, PriceIntelligenceService, type StoreOfferPrice } from "../services/PriceIntelligenceService";
import type { ICanonicalCatalogRepository } from "@/src/domains/canonical-catalog";

function offer(overrides: Partial<StoreOfferPrice> = {}): StoreOfferPrice {
  return { storeId: "store-1", storeSlug: "store-1", priceUSD: 100, ...overrides };
}

describe("computePriceStatistics", () => {
  it("returns null for an empty offer list", () => {
    expect(computePriceStatistics("canonical-1", [])).toBeNull();
  });

  it("computes lowest/highest/average/median/range for an odd number of offers", () => {
    const offers = [offer({ priceUSD: 100 }), offer({ priceUSD: 80 }), offer({ priceUSD: 120 })];
    const result = computePriceStatistics("canonical-1", offers);

    expect(result?.lowestPriceUSD).toBe(80);
    expect(result?.highestPriceUSD).toBe(120);
    expect(result?.averagePriceUSD).toBeCloseTo(100);
    expect(result?.medianPriceUSD).toBe(100);
    expect(result?.priceRangeUSD).toBe(40);
    expect(result?.storeCount).toBe(3);
  });

  it("computes the median as the average of the two middle values for an even count", () => {
    const offers = [offer({ priceUSD: 100 }), offer({ priceUSD: 80 }), offer({ priceUSD: 120 }), offer({ priceUSD: 140 })];
    const result = computePriceStatistics("canonical-1", offers);
    expect(result?.medianPriceUSD).toBe(110);
  });

  it("reports zero dispersion when every store has the same price", () => {
    const offers = [offer({ priceUSD: 100 }), offer({ priceUSD: 100 }), offer({ priceUSD: 100 })];
    const result = computePriceStatistics("canonical-1", offers);
    expect(result?.dispersionPercent).toBe(0);
  });

  it("reports higher dispersion for a wider spread of prices", () => {
    const tight = computePriceStatistics("c1", [offer({ priceUSD: 99 }), offer({ priceUSD: 101 })]);
    const wide = computePriceStatistics("c2", [offer({ priceUSD: 50 }), offer({ priceUSD: 150 })]);
    expect(wide!.dispersionPercent).toBeGreaterThan(tight!.dispersionPercent);
  });
});

describe("computeSavingsOpportunity", () => {
  it("returns null when fewer than 2 offers exist", () => {
    expect(computeSavingsOpportunity("canonical-1", [offer()])).toBeNull();
  });

  it("computes the exact example from the Wave brief (USD 100 vs USD 83)", () => {
    const offers = [
      offer({ storeId: "store-x", storeSlug: "loja-x", priceUSD: 100 }),
      offer({ storeId: "store-y", storeSlug: "loja-y", priceUSD: 83 }),
    ];
    const result = computeSavingsOpportunity("canonical-1", offers);

    expect(result?.cheapestStoreSlug).toBe("loja-y");
    expect(result?.cheapestPriceUSD).toBe(83);
    expect(result?.mostExpensiveStoreSlug).toBe("loja-x");
    expect(result?.maxSavingsUSD).toBe(17);
    expect(result?.maxSavingsPercent).toBe(17);
  });

  it("finds the cheapest and priciest among more than 2 offers", () => {
    const offers = [offer({ storeId: "a", priceUSD: 100 }), offer({ storeId: "b", priceUSD: 60 }), offer({ storeId: "c", priceUSD: 130 })];
    const result = computeSavingsOpportunity("canonical-1", offers);
    expect(result?.cheapestStoreId).toBe("b");
    expect(result?.mostExpensiveStoreId).toBe("c");
    expect(result?.maxSavingsUSD).toBe(70);
  });
});

describe("PriceIntelligenceService", () => {
  function makeRepo(offers: StoreOfferPrice[]): ICanonicalCatalogRepository {
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
        items: offers.map((o, i) => ({
          offerId: `offer-${i}`,
          productId: `product-${i}`,
          storeId: o.storeId,
          storeSlug: o.storeSlug,
          priceUSD: o.priceUSD,
          inStock: true,
          stockQuantity: null,
          updatedAt: new Date().toISOString(),
          condition: null,
          warranty: null,
          productUrl: null,
        })),
        total: offers.length,
      }),
      findOfferIdsByCanonicalProductId: jest.fn(),
      reassignOffers: jest.fn(),
      reassignOffersByIds: jest.fn(),
      deactivateAndMerge: jest.fn(),
      reactivate: jest.fn(),
    };
  }

  it("excludes out-of-stock offers from statistics", async () => {
    const repo: ICanonicalCatalogRepository = {
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
          { offerId: "1", productId: "p1", storeId: "s1", storeSlug: "s1", priceUSD: 100, inStock: true, stockQuantity: null, updatedAt: "", condition: null, warranty: null, productUrl: null },
          { offerId: "2", productId: "p2", storeId: "s2", storeSlug: "s2", priceUSD: 10, inStock: false, stockQuantity: null, updatedAt: "", condition: null, warranty: null, productUrl: null },
        ],
        total: 2,
      }),
      findOfferIdsByCanonicalProductId: jest.fn(),
      reassignOffers: jest.fn(),
      reassignOffersByIds: jest.fn(),
      deactivateAndMerge: jest.fn(),
      reactivate: jest.fn(),
    };

    const service = new PriceIntelligenceService(repo);
    const stats = await service.getStatistics("canonical-1");
    expect(stats?.storeCount).toBe(1);
    expect(stats?.lowestPriceUSD).toBe(100);
  });

  it("computes real statistics end-to-end via the repository", async () => {
    const repo = makeRepo([offer({ priceUSD: 100 }), offer({ priceUSD: 80 })]);
    const service = new PriceIntelligenceService(repo);
    const stats = await service.getStatistics("canonical-1");
    expect(stats?.lowestPriceUSD).toBe(80);
    expect(stats?.highestPriceUSD).toBe(100);
  });
});
