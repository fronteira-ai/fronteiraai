import { CompareFoundationService } from "../services/CompareFoundationService";
import { CanonicalProductService } from "../services/CanonicalProductService";
import { OfferRankingService } from "../services/OfferRankingService";
import { CanonicalPriceHistoryService } from "../services/CanonicalPriceHistoryService";
import type { ICanonicalCatalogRepository } from "../repositories/ICanonicalCatalogRepository";
import type { ICanonicalPriceHistoryRepository } from "../repositories/ICanonicalPriceHistoryRepository";
import type { CanonicalProduct } from "../domain/CanonicalProduct";
import type { CanonicalOfferView } from "../types/canonical-catalog.types";

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
    storeSlug: "test-store",
    priceUSD: 100,
    inStock: true,
    available: true,
    stockQuantity: 5,
    updatedAt: new Date().toISOString(),
    condition: "new",
    warranty: null,
    productUrl: null,
    ...overrides,
  };
}

describe("CompareFoundationService", () => {
  it("returns null when the canonical product doesn't exist", async () => {
    const catalogRepo: ICanonicalCatalogRepository = {
      findBySlug: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      findOrCreateBySlug: jest.fn(),
      updateSyncedFields: jest.fn(),
      findByBrandId: jest.fn(),
      findByCategoryId: jest.fn(),
      findCanonicalProductIdByProductId: jest.fn(),
      findCategorySlugsByIds: jest.fn().mockResolvedValue(new Map()),
      findAll: jest.fn(),
      linkOffer: jest.fn(),
      findOffersByCanonicalProductIds: jest.fn().mockResolvedValue(new Map()),
      findOffersByCanonicalProductId: jest.fn(),
      findOfferIdsByCanonicalProductId: jest.fn(),
      reassignOffers: jest.fn(),
      reassignOffersByIds: jest.fn(),
      deactivateAndMerge: jest.fn(),
      reactivate: jest.fn(),
    };
    const service = new CompareFoundationService(
      new CanonicalProductService(catalogRepo),
      catalogRepo,
      new OfferRankingService(),
      new CanonicalPriceHistoryService({ findByCanonicalProductId: jest.fn() })
    );

    const result = await service.getForSlug("does-not-exist", () => false);
    expect(result).toBeNull();
  });

  it("composes offers, ranking, and price history for an existing canonical product", async () => {
    const canonicalProduct = makeCanonicalProduct();
    const offers = [makeOffer({ offerId: "a", priceUSD: 100 }), makeOffer({ offerId: "b", priceUSD: 90, storeId: "store-2" })];

    const catalogRepo: ICanonicalCatalogRepository = {
      findBySlug: jest.fn().mockResolvedValue(canonicalProduct),
      findById: jest.fn(),
      findOrCreateBySlug: jest.fn(),
      updateSyncedFields: jest.fn(),
      findByBrandId: jest.fn(),
      findByCategoryId: jest.fn(),
      findCanonicalProductIdByProductId: jest.fn(),
      findCategorySlugsByIds: jest.fn().mockResolvedValue(new Map()),
      findAll: jest.fn(),
      linkOffer: jest.fn(),
      findOffersByCanonicalProductIds: jest.fn().mockResolvedValue(new Map()),
      findOffersByCanonicalProductId: jest.fn().mockResolvedValue({ items: offers, total: 2 }),
      findOfferIdsByCanonicalProductId: jest.fn(),
      reassignOffers: jest.fn(),
      reassignOffersByIds: jest.fn(),
      deactivateAndMerge: jest.fn(),
      reactivate: jest.fn(),
    };

    const priceHistoryRepo: ICanonicalPriceHistoryRepository = {
      findByCanonicalProductId: jest.fn().mockResolvedValue([]),
    };

    const service = new CompareFoundationService(
      new CanonicalProductService(catalogRepo),
      catalogRepo,
      new OfferRankingService(),
      new CanonicalPriceHistoryService(priceHistoryRepo)
    );

    const resolveIsVerified = jest.fn().mockImplementation((storeId: string) => storeId === "store-2");
    const result = await service.getForSlug("iphone-15-pro", resolveIsVerified);

    expect(result).not.toBeNull();
    expect(result!.canonicalProduct).toBe(canonicalProduct);
    expect(result!.totalOffers).toBe(2);
    expect(result!.rankedOffers).toHaveLength(2);
    // Cheaper AND verified store should rank first.
    expect(result!.rankedOffers[0].offer.offerId).toBe("b");
    expect(result!.priceAggregation.lowestPriceUSD).toBe(90);
    expect(resolveIsVerified).toHaveBeenCalledWith("store-1");
    expect(resolveIsVerified).toHaveBeenCalledWith("store-2");
  });
  // ── Sprint 9B (P3-1) — oferta arquivada fora do conjunto comparável ─────
  // `available=false` é oferta ARQUIVADA; `inStock=false` é ativa e
  // apenas esgotada (ADR-008). Antes destes testes, a arquivada entrava no
  // ranking, podia ser a mais barata, podia vencer como recomendação e ainda
  // alimentava a evidência "vs. lowest $X among compared offers" do BestDeal.

  function buildService(offers: CanonicalOfferView[], total = offers.length) {
    const canonicalProduct = makeCanonicalProduct();
    const catalogRepo = {
      findBySlug: jest.fn().mockResolvedValue(canonicalProduct),
      findById: jest.fn(),
      findOrCreateBySlug: jest.fn(),
      updateSyncedFields: jest.fn(),
      findByBrandId: jest.fn(),
      findByCategoryId: jest.fn(),
      findCanonicalProductIdByProductId: jest.fn(),
      findCategorySlugsByIds: jest.fn().mockResolvedValue(new Map()),
      findAll: jest.fn(),
      linkOffer: jest.fn(),
      findOffersByCanonicalProductIds: jest.fn().mockResolvedValue(new Map()),
      findOffersByCanonicalProductId: jest.fn().mockResolvedValue({ items: offers, total }),
      findOfferIdsByCanonicalProductId: jest.fn(),
      reassignOffers: jest.fn(),
      reassignOffersByIds: jest.fn(),
      deactivateAndMerge: jest.fn(),
      reactivate: jest.fn(),
    } as unknown as ICanonicalCatalogRepository;
    const priceHistoryRepo: ICanonicalPriceHistoryRepository = { findByCanonicalProductId: jest.fn().mockResolvedValue([]) };
    return {
      service: new CompareFoundationService(
        new CanonicalProductService(catalogRepo),
        catalogRepo,
        new OfferRankingService(),
        new CanonicalPriceHistoryService(priceHistoryRepo)
      ),
      catalogRepo,
    };
  }

  it("mantém oferta ativa com estoque (available=true, inStock=true)", async () => {
    const { service } = buildService([makeOffer({ offerId: "ativa", inStock: true, available: true })]);
    const result = await service.getForSlug("iphone-15-pro", () => false);
    expect(result!.rankedOffers.map((r) => r.offer.offerId)).toEqual(["ativa"]);
  });

  it("mantém oferta ativa esgotada (available=true, inStock=false) — esgotada não é arquivada", async () => {
    const { service } = buildService([makeOffer({ offerId: "esgotada", inStock: false, available: true })]);
    const result = await service.getForSlug("iphone-15-pro", () => false);
    expect(result!.rankedOffers.map((r) => r.offer.offerId)).toEqual(["esgotada"]);
    expect(result!.rankedOffers[0].offer.inStock).toBe(false);
  });

  it("exclui oferta arquivada COM estoque (available=false, inStock=true) — o caso crítico", async () => {
    const { service } = buildService([
      makeOffer({ offerId: "ativa", priceUSD: 200, available: true }),
      makeOffer({ offerId: "arquivada", priceUSD: 100, storeId: "store-2", available: false, inStock: true }),
    ]);
    const result = await service.getForSlug("iphone-15-pro", () => false);
    expect(result!.rankedOffers.map((r) => r.offer.offerId)).toEqual(["ativa"]);
  });

  it("exclui oferta arquivada sem estoque (available=false, inStock=false)", async () => {
    const { service } = buildService([
      makeOffer({ offerId: "ativa", available: true }),
      makeOffer({ offerId: "arquivada", storeId: "store-2", available: false, inStock: false }),
    ]);
    const result = await service.getForSlug("iphone-15-pro", () => false);
    expect(result!.rankedOffers.map((r) => r.offer.offerId)).toEqual(["ativa"]);
  });

  it("devolve conjunto vazio quando todas as ofertas estão arquivadas — nunca um fallback arquivado", async () => {
    const { service } = buildService([
      makeOffer({ offerId: "arq-1", available: false }),
      makeOffer({ offerId: "arq-2", storeId: "store-2", available: false }),
    ]);
    const result = await service.getForSlug("iphone-15-pro", () => false);
    expect(result).not.toBeNull();
    expect(result!.rankedOffers).toEqual([]);
    expect(result!.totalOffers).toBe(0);
  });

  it("a arquivada não pode ser a mais barata nem virar recomendação (rank 1)", async () => {
    const { service } = buildService([
      makeOffer({ offerId: "ativa-cara", priceUSD: 500, available: true }),
      makeOffer({ offerId: "arquivada-barata", priceUSD: 10, storeId: "store-2", available: false, inStock: true }),
    ]);
    const result = await service.getForSlug("iphone-15-pro", () => false);
    // rank 1 é o que o BestDealComposer promove a "Melhor compra".
    expect(result!.rankedOffers[0].offer.offerId).toBe("ativa-cara");
    expect(result!.rankedOffers.some((r) => r.offer.offerId === "arquivada-barata")).toBe(false);
    // lowest passa a ser calculado só sobre as ativas.
    expect(result!.priceAggregation.lowestPriceUSD).toBe(500);
  });

  it("totalOffers conta apenas as comparáveis — o texto \"entre N ofertas\" não pode incluir arquivadas", async () => {
    const { service } = buildService(
      [
        makeOffer({ offerId: "ativa", available: true }),
        makeOffer({ offerId: "arquivada", storeId: "store-2", available: false }),
      ],
      2 // o repositório reporta 2; só 1 é comparável
    );
    const result = await service.getForSlug("iphone-15-pro", () => false);
    expect(result!.totalOffers).toBe(1);
  });

  it("não pede filtro de available ao repositório — a semântica global dele permanece intacta", async () => {
    const { service, catalogRepo } = buildService([makeOffer({ available: true })]);
    await service.getForSlug("iphone-15-pro", () => false);
    // O repositório é compartilhado com market-insights e buyer-intelligence:
    // continua sendo chamado só com (id, pagination), sem nenhum filtro novo.
    expect(catalogRepo.findOffersByCanonicalProductId).toHaveBeenCalledWith(
      "canonical-1",
      expect.objectContaining({ limit: expect.any(Number), offset: expect.any(Number) })
    );
  });
});
