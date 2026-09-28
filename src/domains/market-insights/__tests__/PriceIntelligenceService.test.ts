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
      findCategorySlugsByIds: jest.fn().mockResolvedValue(new Map()),
      findAll: jest.fn(),
      linkOffer: jest.fn(),
      findOffersByCanonicalProductIds: jest.fn().mockResolvedValue(new Map()),
      findOffersByCanonicalProductId: jest.fn().mockResolvedValue({
        items: offers.map((o, i) => ({
          offerId: `offer-${i}`,
          productId: `product-${i}`,
          storeId: o.storeId,
          storeSlug: o.storeSlug,
          priceUSD: o.priceUSD,
          inStock: true,
          available: true,
          // P2 — as fixtures deste arquivo representam ofertas de lojas
          // PÚBLICAS (todas têm storeId/storeSlug reais): a evidência
          // positiva `storeActive: true` é exatamente o que
          // `fetchOfferPrices` exige. Ausência de evidência não é público.
          storeActive: true,
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
      findCategorySlugsByIds: jest.fn().mockResolvedValue(new Map()),
      findAll: jest.fn(),
      linkOffer: jest.fn(),
      findOffersByCanonicalProductIds: jest.fn().mockResolvedValue(new Map()),
      findOffersByCanonicalProductId: jest.fn().mockResolvedValue({
        items: [
          // Duas lojas PÚBLICAS: a única diferença entre elas é o estoque
          // (s2 está esgotada) — exatamente o que este teste mede.
          { offerId: "1", productId: "p1", storeId: "s1", storeSlug: "s1", priceUSD: 100, inStock: true, available: true, storeActive: true, stockQuantity: null, updatedAt: "", condition: null, warranty: null, productUrl: null },
          { offerId: "2", productId: "p2", storeId: "s2", storeSlug: "s2", priceUSD: 10, inStock: false, available: true, storeActive: true, stockQuantity: null, updatedAt: "", condition: null, warranty: null, productUrl: null },
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
  // ── Sprint 11 — oferta arquivada fora das estatísticas ──────────────────
  // Regra de domínio já estabelecida (ADR-008; Sprints 5, 9B, 10): available=false
  // é oferta ARQUIVADA e não forma preço ativo. Este serviço era a última
  // leitura que a ignorava — e a inconsistência era observável, porque o grid
  // de /products e /search já calcula seu preço sem as arquivadas.

  function repoWith(items: unknown[]) {
    return {
      findBySlug: jest.fn(), findById: jest.fn(), findOrCreateBySlug: jest.fn(),
      updateSyncedFields: jest.fn(), findByBrandId: jest.fn(), findByCategoryId: jest.fn(),
      findCanonicalProductIdByProductId: jest.fn(), findCategorySlugsByIds: jest.fn().mockResolvedValue(new Map()),
      findAll: jest.fn(), linkOffer: jest.fn(),
      findOffersByCanonicalProductIds: jest.fn().mockResolvedValue(new Map()),
      findOffersByCanonicalProductId: jest.fn().mockResolvedValue({ items, total: items.length }),
      findOfferIdsByCanonicalProductId: jest.fn(), reassignOffers: jest.fn(),
      reassignOffersByIds: jest.fn(), deactivateAndMerge: jest.fn(), reactivate: jest.fn(),
    } as unknown as ICanonicalCatalogRepository;
  }
  // `storeActive: true` é o default porque TODAS as fixtures abaixo
  // representam ofertas de lojas públicas: as variações que estes testes
  // exercitam são `available` (arquivada) e `inStock` (esgotada), nunca a
  // visibilidade da loja. O gate de loja ativa tem testes próprios logo
  // abaixo, com evidência negativa/ausente explícita.
  const offer = (o: Record<string, unknown>) => ({
    offerId: "o", productId: "p", storeId: "s", storeSlug: "s", priceUSD: 100,
    inStock: true, available: true, storeActive: true, stockQuantity: null, updatedAt: "",
    condition: null, warranty: null, productUrl: null, ...o,
  });

  it("exclui oferta arquivada das estatísticas, mesmo com estoque", async () => {
    const service = new PriceIntelligenceService(repoWith([
      offer({ offerId: "arquivada", storeId: "s1", storeSlug: "s1", priceUSD: 50, available: false, inStock: true }),
      offer({ offerId: "ativa-a", storeId: "s2", storeSlug: "s2", priceUSD: 100 }),
      offer({ offerId: "ativa-b", storeId: "s3", storeSlug: "s3", priceUSD: 200 }),
    ]));
    const stats = await service.getStatistics("canonical-1");
    // $50 é arquivada: não pode ser o menor preço nem contar como loja.
    expect(stats?.lowestPriceUSD).toBe(100);
    expect(stats?.storeCount).toBe(2);
  });

  it("exclui oferta arquivada do cálculo de economia", async () => {
    const service = new PriceIntelligenceService(repoWith([
      offer({ offerId: "arquivada", storeId: "s1", storeSlug: "s1", priceUSD: 50, available: false }),
      offer({ offerId: "ativa-a", storeId: "s2", storeSlug: "s2", priceUSD: 100 }),
      offer({ offerId: "ativa-b", storeId: "s3", storeSlug: "s3", priceUSD: 200 }),
    ]));
    const savings = await service.getSavingsOpportunity("canonical-1");
    // Economia sai de 200 -> 100, nunca de 200 -> 50 (arquivada).
    expect(savings?.cheapestPriceUSD).toBe(100);
    expect(savings?.maxSavingsUSD).toBe(100);
  });

  it("mantém a regra pré-existente: esgotada porém ATIVA continua fora do preço", async () => {
    const service = new PriceIntelligenceService(repoWith([
      offer({ offerId: "esgotada", storeId: "s1", storeSlug: "s1", priceUSD: 50, available: true, inStock: false }),
      offer({ offerId: "ativa", storeId: "s2", storeSlug: "s2", priceUSD: 100 }),
    ]));
    const stats = await service.getStatistics("canonical-1");
    // Este filtro é anterior à Sprint 11 e não foi alterado.
    expect(stats?.storeCount).toBe(1);
    expect(stats?.lowestPriceUSD).toBe(100);
  });

  it("devolve null quando todas as ofertas estão arquivadas — sem fallback arquivado", async () => {
    const service = new PriceIntelligenceService(repoWith([
      offer({ offerId: "a1", storeId: "s1", storeSlug: "s1", available: false }),
      offer({ offerId: "a2", storeId: "s2", storeSlug: "s2", priceUSD: 200, available: false }),
    ]));
    expect(await service.getStatistics("canonical-1")).toBeNull();
    expect(await service.getSavingsOpportunity("canonical-1")).toBeNull();
  });

  // ── P2 Public Catalog Visibility — o gate de loja ativa ─────────────────
  // Estes dois testes existem para provar que a correção das fixtures acima
  // NÃO mascarou o gate: uma oferta de loja não-pública (ou sem evidência de
  // loja ativa) continua fora do preço, mesmo com `available=true` e
  // `inStock=true` e mesmo sendo a mais barata.
  it("exclui oferta de loja NÃO pública (storeActive=false), mesmo sendo a mais barata", async () => {
    const service = new PriceIntelligenceService(repoWith([
      offer({ offerId: "loja-inativa", storeId: "s1", storeSlug: "s1", priceUSD: 50, storeActive: false }),
      offer({ offerId: "loja-publica", storeId: "s2", storeSlug: "s2", priceUSD: 100 }),
    ]));
    const stats = await service.getStatistics("canonical-1");
    expect(stats?.lowestPriceUSD).toBe(100);
    expect(stats?.storeCount).toBe(1);

    const savings = await service.getSavingsOpportunity("canonical-1");
    expect(savings).toBeNull(); // 1 loja pública só → não há economia entre lojas
  });

  it("fail-closed: sem evidência de loja ativa (storeActive ausente) a oferta não forma preço", async () => {
    // Objeto deliberadamente SEM `storeActive` — o único produtor real
    // (`SupabaseCanonicalCatalogRepository.mapOfferRow`) só emite `true` com
    // `stores.active === true`; ausência de evidência nunca concede
    // visibilidade pública.
    const semEvidencia = {
      offerId: "sem-evidencia", productId: "p", storeId: "s1", storeSlug: "s1",
      priceUSD: 10, inStock: true, available: true, stockQuantity: null,
      updatedAt: "", condition: null, warranty: null, productUrl: null,
    };
    const service = new PriceIntelligenceService(repoWith([semEvidencia]));
    expect(await service.getStatistics("canonical-1")).toBeNull();
    expect(await service.getSavingsOpportunity("canonical-1")).toBeNull();
  });
});
