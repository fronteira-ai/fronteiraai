import { PurchaseTimingComposer } from "../services/PurchaseTimingComposer";
import type { ComparisonIntelligenceBundle, RankedOfferIntelligence } from "../types/buyer-intelligence.types";
import type { VolatilityRollupService, CanonicalVolatilityProfile } from "@/src/domains/market-insights";
import { VolatilityClass } from "@/src/domains/realtime-commerce";
import type { ExchangeHistoryService } from "@/src/domains/exchange";
import { CurrencyPair } from "@/src/domains/exchange";
import { FreshnessClass } from "@/src/domains/realtime-commerce";
import type { CanonicalProduct, CanonicalOfferView, CanonicalPriceAggregation } from "@/src/domains/canonical-catalog";

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
    factors: [],
    isVerifiedStore: true,
    freshness: { offerId: "offer-1", score: 100, classification: FreshnessClass.Live, ageSeconds: 10, lastChangeAt: null },
    ...overrides,
  };
}

function makeAggregation(overrides: Partial<CanonicalPriceAggregation> = {}): CanonicalPriceAggregation {
  return {
    lowestPriceUSD: 100,
    highestPriceUSD: 100,
    averagePriceUSD: 100,
    lastPriceUSD: 100,
    variationPercent: 0,
    trend: "stable",
    lastUpdatedAt: "2026-07-13T00:00:00Z",
    firstSeenAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

function makeBundle(overrides: Partial<ComparisonIntelligenceBundle> = {}): ComparisonIntelligenceBundle {
  return {
    canonicalProduct: makeCanonicalProduct(),
    offers: [makeRanked()],
    totalOffers: 1,
    priceAggregation: makeAggregation(),
    priceStatistics: null,
    savingsOpportunity: null,
    errors: {},
    ...overrides,
  };
}

function makeVolatilityService(profile: CanonicalVolatilityProfile | null = null): VolatilityRollupService {
  return { getCanonicalVolatility: jest.fn().mockResolvedValue(profile) } as unknown as VolatilityRollupService;
}

function makeExchangeHistoryService(rates: Array<{ pair: CurrencyPair; rate: number; source: string; capturedAt: string }> = []): ExchangeHistoryService {
  return { getRange: jest.fn().mockResolvedValue(rates) } as unknown as ExchangeHistoryService;
}

describe("PurchaseTimingComposer", () => {
  it("returns insufficient_data when there is no price history at all (trend=unknown) — never guesses", async () => {
    const bundle = makeBundle({ priceAggregation: makeAggregation({ trend: "unknown", variationPercent: null, firstSeenAt: null, lastUpdatedAt: null }) });
    const composer = new PurchaseTimingComposer(makeVolatilityService(), makeExchangeHistoryService());

    const result = await composer.compose(bundle);
    expect(result.verdict).toBe("insufficient_data");
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0].label).toBe("Não há dados suficientes");
  });

  it("recommends buy_now when price is trending down (existing trend signal, no new math)", async () => {
    const bundle = makeBundle({ priceAggregation: makeAggregation({ trend: "down", variationPercent: -15 }) });
    const composer = new PurchaseTimingComposer(makeVolatilityService(), makeExchangeHistoryService());

    const result = await composer.compose(bundle);
    expect(result.verdict).toBe("buy_now");
    expect(result.reasons.some((r) => r.label === "Preço em queda")).toBe(true);
  });

  it("recommends better_wait when price is trending up AND above the cross-store median", async () => {
    const bundle = makeBundle({
      priceAggregation: makeAggregation({ trend: "up", variationPercent: 18, lastPriceUSD: 130 }),
      priceStatistics: { canonicalProductId: "canonical-1", storeCount: 3, lowestPriceUSD: 90, highestPriceUSD: 130, averagePriceUSD: 105, medianPriceUSD: 100, priceRangeUSD: 40, dispersionPercent: 10, computedAt: "2026-07-13T00:00:00Z" },
    });
    const composer = new PurchaseTimingComposer(makeVolatilityService(), makeExchangeHistoryService());

    const result = await composer.compose(bundle);
    expect(result.verdict).toBe("better_wait");
    expect(result.reasons.some((r) => r.label === "Preço em alta")).toBe(true);
    expect(result.reasons.some((r) => r.label === "Preço acima da média")).toBe(true);
  });

  it("recommends can_wait on a stable price with no other strong signal (tie, not a coin flip)", async () => {
    const bundle = makeBundle({ priceAggregation: makeAggregation({ trend: "stable", variationPercent: 0.5 }) });
    const composer = new PurchaseTimingComposer(makeVolatilityService(), makeExchangeHistoryService());

    const result = await composer.compose(bundle);
    expect(result.verdict).toBe("can_wait");
    expect(result.reasons.some((r) => r.label === "Preço estável")).toBe(true);
  });

  it("cites Câmbio favorável only when USD/BRL fell beyond the tolerance band over the lookback window", async () => {
    const bundle = makeBundle({ priceAggregation: makeAggregation({ trend: "stable" }) });
    const rates = [
      { pair: CurrencyPair.UsdBrl, rate: 5.6, source: "test", capturedAt: "2026-06-13T00:00:00Z" },
      { pair: CurrencyPair.UsdBrl, rate: 5.4, source: "test", capturedAt: "2026-07-13T00:00:00Z" },
    ];
    const composer = new PurchaseTimingComposer(makeVolatilityService(), makeExchangeHistoryService(rates));

    const result = await composer.compose(bundle);
    expect(result.reasons.some((r) => r.label === "Câmbio favorável")).toBe(true);
    expect(result.verdict).toBe("buy_now");
  });

  it("adds a 'Baixa confiança temporal' reason when the recommended offer's data is stale, without changing the verdict math", async () => {
    const staleOffer = makeRanked({
      freshness: { offerId: "offer-1", score: 10, classification: FreshnessClass.Stale, ageSeconds: 999999, lastChangeAt: null },
    });
    const bundle = makeBundle({ offers: [staleOffer], priceAggregation: makeAggregation({ trend: "down", variationPercent: -5 }) });
    const composer = new PurchaseTimingComposer(makeVolatilityService(), makeExchangeHistoryService());

    const result = await composer.compose(bundle);
    expect(result.reasons.some((r) => r.label === "Baixa confiança temporal")).toBe(true);
    // Still buy_now — freshness is a confidence caveat, not a vote.
    expect(result.verdict).toBe("buy_now");
  });

  it("adds a volatility-based 'Baixa confiança temporal' reason for a very volatile product", async () => {
    const bundle = makeBundle({ priceAggregation: makeAggregation({ trend: "down", variationPercent: -5 }) });
    const volatileProfile: CanonicalVolatilityProfile = { canonicalProductId: "canonical-1", score: 85, classification: VolatilityClass.MuitoVolatil, productsScored: 3 };
    const composer = new PurchaseTimingComposer(makeVolatilityService(volatileProfile), makeExchangeHistoryService());

    const result = await composer.compose(bundle);
    expect(result.volatility).toBe(volatileProfile);
    expect(result.reasons.filter((r) => r.label === "Baixa confiança temporal")).toHaveLength(1);
  });

  it("isolates a volatility service failure instead of failing the whole result", async () => {
    const bundle = makeBundle({ priceAggregation: makeAggregation({ trend: "stable" }) });
    const broken = { getCanonicalVolatility: jest.fn().mockRejectedValue(new Error("volatility down")) } as unknown as VolatilityRollupService;
    const composer = new PurchaseTimingComposer(broken, makeExchangeHistoryService());

    const result = await composer.compose(bundle);
    expect(result.volatility).toBeNull();
    expect(result.errors.volatility).toBe("volatility down");
    expect(result.verdict).toBe("can_wait");
  });
});
