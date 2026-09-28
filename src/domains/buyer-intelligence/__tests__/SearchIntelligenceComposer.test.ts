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
    findCategorySlugsByIds: jest.fn().mockResolvedValue(new Map()),
    findAll: jest.fn(),
    linkOffer: jest.fn(),
    findOffersByCanonicalProductIds: jest.fn().mockResolvedValue(new Map()),
    findOffersByCanonicalProductId: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    findOfferIdsByCanonicalProductId: jest.fn(),
    reassignOffers: jest.fn(),
    reassignOffersByIds: jest.fn(),
    deactivateAndMerge: jest.fn(),
    reactivate: jest.fn(),
    ...overrides,
  };
}

/**
 * Oferta de loja PÚBLICA (o caso normal): `storeActive: true` é a evidência
 * positiva que `PriceIntelligenceService.fetchOfferPrices` exige
 * (`available && inStock && storeActive === true`). Sem ela a estatística é
 * `null` — é justamente por isso que as fixtures deste arquivo precisam
 * declará-la: cada oferta abaixo representa uma loja real e ativa.
 */
function publicOffer(overrides: Record<string, unknown> = {}) {
  return {
    offerId: "a", productId: "p1", storeId: "s1", storeSlug: "s1", priceUSD: 100,
    inStock: true, available: true, storeActive: true, stockQuantity: 1,
    updatedAt: new Date().toISOString(), condition: null, warranty: null, productUrl: null,
    ...overrides,
  };
}

describe("SearchIntelligenceComposer", () => {
  it("marks belowAveragePrice=false for products with no known price", async () => {
    const catalogRepo = makeCatalogRepo();
    const composer = new SearchIntelligenceComposer(catalogRepo, new PriceIntelligenceService(catalogRepo));

    const result = await composer.composeForProducts([{ productId: "p1", priceUSD: null }]);
    expect(result.get("p1")).toEqual({ productId: "p1", belowAveragePrice: false, isBestDeal: false, savingsVsMedianPercent: 0 });
  });

  it("marks belowAveragePrice=false for products with no canonical link yet", async () => {
    const catalogRepo = makeCatalogRepo({ findCanonicalProductIdByProductId: jest.fn().mockResolvedValue(null) });
    const composer = new SearchIntelligenceComposer(catalogRepo, new PriceIntelligenceService(catalogRepo));

    const result = await composer.composeForProducts([{ productId: "p1", priceUSD: 50 }]);
    expect(result.get("p1")).toEqual({ productId: "p1", belowAveragePrice: false, isBestDeal: false, savingsVsMedianPercent: 0 });
  });

  it("marks belowAveragePrice=true and isBestDeal=true when the given price is the group's lowest and well under the median", async () => {
    const catalogRepo = makeCatalogRepo({
      findCanonicalProductIdByProductId: jest.fn().mockResolvedValue("canonical-1"),
      findOffersByCanonicalProductIds: jest.fn().mockResolvedValue(new Map()),
      findOffersByCanonicalProductId: jest.fn().mockResolvedValue({
        items: [
          publicOffer({ offerId: "a", productId: "p1", storeId: "s1", storeSlug: "s1", priceUSD: 100 }),
          publicOffer({ offerId: "b", productId: "p2", storeId: "s2", storeSlug: "s2", priceUSD: 100 }),
        ],
        total: 2,
      }),
    });
    const composer = new SearchIntelligenceComposer(catalogRepo, new PriceIntelligenceService(catalogRepo));

    // Median/lowest of [100, 100] is 100; 50 is well under 90% of that and
    // <= the group's lowest, so both signals fire from the same statistics
    // call — no second query for isBestDeal. savingsVsMedianPercent = (100-50)/100 * 100 = 50.
    const result = await composer.composeForProducts([{ productId: "p1", priceUSD: 50 }]);
    expect(result.get("p1")).toEqual({ productId: "p1", belowAveragePrice: true, isBestDeal: true, savingsVsMedianPercent: 50 });
  });

  it("marks isBestDeal=false when this price is not the group's lowest, even if canonical-linked", async () => {
    const catalogRepo = makeCatalogRepo({
      findCanonicalProductIdByProductId: jest.fn().mockResolvedValue("canonical-1"),
      findOffersByCanonicalProductIds: jest.fn().mockResolvedValue(new Map()),
      findOffersByCanonicalProductId: jest.fn().mockResolvedValue({
        items: [
          publicOffer({ offerId: "a", productId: "p1", storeId: "s1", storeSlug: "s1", priceUSD: 80 }),
          publicOffer({ offerId: "b", productId: "p2", storeId: "s2", storeSlug: "s2", priceUSD: 100 }),
        ],
        total: 2,
      }),
    });
    const composer = new SearchIntelligenceComposer(catalogRepo, new PriceIntelligenceService(catalogRepo));

    // Este produto custa 100 e o menor do grupo é 80 — o selo não pode sair.
    // (Antes da correção das fixtures este teste passava por vacuidade: sem
    // evidência de loja ativa a estatística era `null` e o selo também não
    // saía, mas pelo motivo errado.)
    const result = await composer.composeForProducts([{ productId: "p1", priceUSD: 100 }]);
    expect(result.get("p1")?.isBestDeal).toBe(false);
  });

  it("não concede selo quando a loja NÃO é pública (storeActive=false)", async () => {
    // Mesmo dado do caso positivo (preço 50 contra mediana 100), mas sem
    // evidência de loja ativa nas ofertas: a estatística não existe, então
    // nenhum selo é concedido — fail-closed no grid de busca.
    const catalogRepo = makeCatalogRepo({
      findCanonicalProductIdByProductId: jest.fn().mockResolvedValue("canonical-1"),
      findOffersByCanonicalProductIds: jest.fn().mockResolvedValue(new Map()),
      findOffersByCanonicalProductId: jest.fn().mockResolvedValue({
        items: [
          publicOffer({ offerId: "a", productId: "p1", storeId: "s1", storeSlug: "s1", priceUSD: 100, storeActive: false }),
          publicOffer({ offerId: "b", productId: "p2", storeId: "s2", storeSlug: "s2", priceUSD: 100, storeActive: false }),
        ],
        total: 2,
      }),
    });
    const composer = new SearchIntelligenceComposer(catalogRepo, new PriceIntelligenceService(catalogRepo));

    const result = await composer.composeForProducts([{ productId: "p1", priceUSD: 50 }]);
    expect(result.get("p1")).toEqual({ productId: "p1", belowAveragePrice: false, isBestDeal: false, savingsVsMedianPercent: 0 });
  });
});
