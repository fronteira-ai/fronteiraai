import { OfferRankingService, type OfferRankInput } from "../services/OfferRankingService";
import type { CanonicalOfferView } from "../types/canonical-catalog.types";

function makeOffer(overrides: Partial<CanonicalOfferView> = {}): CanonicalOfferView {
  return {
    offerId: "offer-1",
    productId: "product-1",
    storeId: "store-1",
    storeSlug: "test-store",
    priceUSD: 100,
    inStock: true,
    stockQuantity: 10,
    updatedAt: new Date().toISOString(),
    condition: "new",
    warranty: "12 months",
    productUrl: "https://example.com/product",
    ...overrides,
  };
}

describe("OfferRankingService", () => {
  const service = new OfferRankingService();

  it("returns an empty array for no offers", () => {
    expect(service.rank([])).toEqual([]);
  });

  it("ranks the cheapest in-stock, verified, fresh, complete listing first", () => {
    const inputs: OfferRankInput[] = [
      { offer: makeOffer({ offerId: "cheap-verified", priceUSD: 100 }), isVerifiedStore: true },
      { offer: makeOffer({ offerId: "expensive-unverified", priceUSD: 200 }), isVerifiedStore: false },
    ];

    const ranked = service.rank(inputs);

    expect(ranked[0].offer.offerId).toBe("cheap-verified");
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].offer.offerId).toBe("expensive-unverified");
    expect(ranked[1].rank).toBe(2);
    expect(ranked[0].rankScore).toBeGreaterThan(ranked[1].rankScore);
  });

  it("penalizes out-of-stock offers", () => {
    const inputs: OfferRankInput[] = [
      { offer: makeOffer({ offerId: "in-stock", inStock: true }), isVerifiedStore: false },
      { offer: makeOffer({ offerId: "out-of-stock", inStock: false }), isVerifiedStore: false },
    ];

    const ranked = service.rank(inputs);
    expect(ranked[0].offer.offerId).toBe("in-stock");

    const outOfStockFactor = ranked
      .find((r) => r.offer.offerId === "out-of-stock")!
      .factors.find((f) => f.factor === "availability");
    expect(outOfStockFactor?.weight).toBe(0);
  });

  it("penalizes stale offers via the recency factor", () => {
    const staleDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days ago
    const inputs: OfferRankInput[] = [
      { offer: makeOffer({ offerId: "fresh" }), isVerifiedStore: false },
      { offer: makeOffer({ offerId: "stale", updatedAt: staleDate }), isVerifiedStore: false },
    ];

    const ranked = service.rank(inputs);
    const staleFactor = ranked.find((r) => r.offer.offerId === "stale")!.factors.find((f) => f.factor === "recency");
    expect(staleFactor?.weight).toBe(0);
  });

  it("returns a full factor breakdown for every offer — never an opaque number", () => {
    const [ranked] = service.rank([{ offer: makeOffer(), isVerifiedStore: true }]);
    const factorNames = ranked.factors.map((f) => f.factor).sort();
    expect(factorNames).toEqual(["availability", "listing-quality", "price", "recency", "trust"]);
  });

  it("never produces a 'reputation'/'score' field — trust is an explicit verified boolean only (Zero Reputation Score constraint)", () => {
    const [ranked] = service.rank([{ offer: makeOffer(), isVerifiedStore: true }]);
    const serialized = JSON.stringify(ranked).toLowerCase();
    expect(serialized).not.toContain("reputation");
    const trustFactor = ranked.factors.find((f) => f.factor === "trust");
    expect(trustFactor?.evidence).toContain("verified");
  });
});
