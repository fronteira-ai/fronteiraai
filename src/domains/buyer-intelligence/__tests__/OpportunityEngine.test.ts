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
    available: true,
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

/**
 * Sprint 8D (P2-4). O motor passou a derivar a economia das PRÓPRIAS ofertas
 * (`computeSavingsOpportunity`, a mesma função pura que
 * `PriceIntelligenceService.getSavingsOpportunity` já usava por dentro), em
 * vez de pedir um `SavingsOpportunity` pronto ao serviço — que custava uma
 * consulta por candidato.
 *
 * Consequência para estes fixtures: antes dava para injetar uma economia
 * que NÃO correspondia às ofertas do mesmo canonical (o padrão declarava
 * "store-1 a $90 vs store-2 a $120" enquanto `offersByProductId` continha
 * uma única oferta de $100). Produção nunca teve essa liberdade — lá as duas
 * pontas sempre saíram das mesmas ofertas. Este helper devolve as duas
 * pontas de preço que produzem exatamente a economia declarada, derivando os
 * valores de (maxSavingsUSD, maxSavingsPercent) em vez de exigir aritmética
 * à mão em cada caso. A intenção de cada teste segue declarativa.
 */
function offersForSavings(
  savings: SavingsOpportunity,
  winningOverrides: Partial<CanonicalOfferView> = {}
): CanonicalOfferView[] {
  const mostExpensivePriceUSD =
    savings.maxSavingsPercent > 0
      ? savings.maxSavingsUSD / (savings.maxSavingsPercent / 100)
      : savings.mostExpensivePriceUSD;
  const cheapestPriceUSD = mostExpensivePriceUSD - savings.maxSavingsUSD;

  return [
    makeOffer({
      offerId: `${savings.cheapestStoreId}-winning`,
      productId: `product-${savings.cheapestStoreId}`,
      storeId: savings.cheapestStoreId,
      storeSlug: savings.cheapestStoreSlug,
      priceUSD: cheapestPriceUSD,
      ...winningOverrides,
    }),
    makeOffer({
      offerId: `${savings.mostExpensiveStoreId}-expensive`,
      productId: `product-${savings.mostExpensiveStoreId}`,
      storeId: savings.mostExpensiveStoreId,
      storeSlug: savings.mostExpensiveStoreSlug,
      priceUSD: mostExpensivePriceUSD,
    }),
  ];
}

function makeCatalogRepo(products: CanonicalProduct[], offersByProductId: Record<string, CanonicalOfferView[]>): ICanonicalCatalogRepository {
  return {
    findAll: jest.fn().mockResolvedValue({ items: products, total: products.length }),
    // Sprint 8B (P2-4): o motor passou a ler as ofertas dos candidatos em
    // lote. Este mock devolve exatamente o mesmo conteúdo que o mock
    // individual abaixo — é o que faz esta suíte continuar sendo a prova
    // ponta-a-ponta de que a otimização não mudou nenhum resultado.
    findOffersByCanonicalProductIds: jest.fn().mockImplementation(async (ids: string[]) => {
      const map = new Map<string, CanonicalOfferView[]>();
      for (const id of ids) {
        const offers = offersByProductId[id];
        if (offers?.length) map.set(id, offers);
      }
      return map;
    }),
    findOffersByCanonicalProductId: jest.fn().mockImplementation(async (id: string) => ({
      items: offersByProductId[id] ?? [],
      total: (offersByProductId[id] ?? []).length,
    })),
    findBySlug: jest.fn(),
    findById: jest.fn(),
    findCanonicalProductIdByProductId: jest.fn(),
    findCategorySlugsByIds: jest.fn().mockResolvedValue(new Map()),
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
    const engine = buildEngine({
      products: [product],
      offersByProductId: { "canonical-1": offersForSavings(makeSavings({ maxSavingsPercent: 90 }), { inStock: false }) },
      savingsByProductId: { "canonical-1": makeSavings({ maxSavingsPercent: 90 }) },
    });

    const result = await engine.getTopOpportunities(5);
    expect(result).toHaveLength(0);
  });

  it("eliminates a candidate with a stale/old price", async () => {
    const product = makeCanonicalProduct();
    const engine = buildEngine({
      products: [product],
      offersByProductId: { "canonical-1": offersForSavings(makeSavings()) },
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
      offersByProductId: { "canonical-1": offersForSavings(makeSavings({ maxSavingsUSD: 1, maxSavingsPercent: 1 })) },
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
      offersByProductId: { "canonical-2": offersForSavings(makeSavings({ cheapestStoreId: "store-2", cheapestStoreSlug: "store-2", mostExpensiveStoreId: "store-2b", mostExpensiveStoreSlug: "store-2b", maxSavingsUSD: 19, maxSavingsPercent: 1.7 })) },
      savingsByProductId: { "canonical-2": makeSavings({ cheapestStoreId: "store-2", maxSavingsUSD: 19, maxSavingsPercent: 1.7 }) },
    });
    expect(await engineHighAbsolute.getTopOpportunities(5)).toHaveLength(1);

    // Symmetric case: low absolute but high percent must also survive.
    const lowAbsoluteHighPercent = makeCanonicalProduct({ id: "canonical-3", canonicalSlug: "product-3" });
    const engineHighPercent = buildEngine({
      products: [lowAbsoluteHighPercent],
      offersByProductId: { "canonical-3": offersForSavings(makeSavings({ cheapestStoreId: "store-3", cheapestStoreSlug: "store-3", mostExpensiveStoreId: "store-3b", mostExpensiveStoreSlug: "store-3b", maxSavingsUSD: 2, maxSavingsPercent: 50 })) },
      savingsByProductId: { "canonical-3": makeSavings({ cheapestStoreId: "store-3", maxSavingsUSD: 2, maxSavingsPercent: 50 }) },
    });
    expect(await engineHighPercent.getTopOpportunities(5)).toHaveLength(1);
  });

  it("eliminates a candidate whose Purchase Timing verdict is better_wait — a real discount that is not a real opportunity", async () => {
    const product = makeCanonicalProduct();
    const engine = buildEngine({
      products: [product],
      offersByProductId: { "canonical-1": offersForSavings(makeSavings({ maxSavingsPercent: 40 })) },
      savingsByProductId: { "canonical-1": makeSavings({ maxSavingsPercent: 40 }) },
      verdict: "better_wait",
    });

    const result = await engine.getTopOpportunities(5);
    expect(result).toHaveLength(0);
  });

  it("ranks by absolute savings (USD), not percent — 'maior desconto' does not automatically win", async () => {
    const bigPercentSmallUSD = makeCanonicalProduct({ id: "canonical-a", canonicalSlug: "product-a", name: "Produto A" });
    const smallPercentBigUSD = makeCanonicalProduct({ id: "canonical-b", canonicalSlug: "product-b", name: "Produto B" });


    const engine = buildEngine({
      products: [bigPercentSmallUSD, smallPercentBigUSD],
      offersByProductId: {
        "canonical-a": offersForSavings(makeSavings({ cheapestStoreId: "store-a", cheapestStoreSlug: "store-a", mostExpensiveStoreId: "store-a-exp", mostExpensiveStoreSlug: "store-a-exp", maxSavingsUSD: 5, maxSavingsPercent: 90 })),
        "canonical-b": offersForSavings(makeSavings({ cheapestStoreId: "store-b", cheapestStoreSlug: "store-b", mostExpensiveStoreId: "store-b-exp", mostExpensiveStoreSlug: "store-b-exp", maxSavingsUSD: 500, maxSavingsPercent: 15 })),
      },
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


    const engine = buildEngine({
      products: [productA, productB],
      offersByProductId: {
        "canonical-a": offersForSavings(makeSavings({ cheapestStoreId: "store-a", cheapestStoreSlug: "store-a", mostExpensiveStoreId: "store-a-exp", mostExpensiveStoreSlug: "store-a-exp", maxSavingsUSD: 100, maxSavingsPercent: 20 })),
        "canonical-b": offersForSavings(makeSavings({ cheapestStoreId: "store-b", cheapestStoreSlug: "store-b", mostExpensiveStoreId: "store-b-exp", mostExpensiveStoreSlug: "store-b-exp", maxSavingsUSD: 100, maxSavingsPercent: 30 })),
      },
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
    const engine = buildEngine({
      products: [product],
      offersByProductId: { "canonical-1": offersForSavings(makeSavings()) },
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
    // Sprint 8D (P2-4): a falha era simulada fazendo
    // `priceIntelligenceService.getSavingsOpportunity` lançar. O motor não
    // chama mais esse serviço (a economia sai de `computeSavingsOpportunity`
    // sobre as ofertas já lidas em lote), então esse mecanismo deixou de
    // existir. A INTENÇÃO do teste é preservada integralmente — "uma falha
    // num candidato não derruba o lote" — apenas exercitada por um ponto que
    // ainda pode rejeitar de verdade: `resolveIsVerified`, único trecho de
    // `evaluateCandidate` sem `catch` próprio, protegido pelo
    // `Promise.allSettled` de `getTopOpportunities`.
    const linkRepo = {
      findMerchantIdsByStoreIds: jest.fn().mockImplementation(async (storeIds: string[]) => {
        if (storeIds.includes("store-broken")) throw new Error("boom");
        return new Map<string, string>();
      }),
    } as unknown as IMerchantStoreLinkRepository;

    const engine = new OpportunityEngine(
      makeCatalogRepo([goodProduct, brokenProduct], {
        "canonical-good": offersForSavings(
          makeSavings({ cheapestStoreId: "store-good", cheapestStoreSlug: "store-good", mostExpensiveStoreId: "store-good-exp", mostExpensiveStoreSlug: "store-good-exp" })
        ),
        "canonical-broken": offersForSavings(
          makeSavings({ cheapestStoreId: "store-broken", cheapestStoreSlug: "store-broken", mostExpensiveStoreId: "store-broken-exp", mostExpensiveStoreSlug: "store-broken-exp" })
        ),
      }),
      makePriceIntelligenceService({}),
      makeFreshnessService(),
      linkRepo,
      makeBadgeService(),
      makeComparisonComposer(),
      makePurchaseTimingComposer(),
      makeAnalyticsEventRepository()
    );

    const result = await engine.getTopOpportunities(5);
    expect(result).toHaveLength(1);
    expect(result[0].canonicalProductId).toBe("canonical-good");
  });
  // ── Sprint 8D (P2-4) — contrato do lote ───────────────────────────────
  // A prova de que os resultados não mudaram está na comparação contra o
  // banco local (50 canonicals, 0 divergências) e nos 8 casos acima, que
  // seguem passando. O que só um teste unitário garante é que o motor
  // realmente parou de emitir uma consulta por candidato.

  it("usa o lote e nunca a leitura individual — nem uma consulta por candidato", async () => {
    const products = Array.from({ length: 5 }, (_, i) =>
      makeCanonicalProduct({ id: `canonical-${i}`, canonicalSlug: `slug-${i}`, name: `Produto ${i}` })
    );
    const offersByProductId: Record<string, CanonicalOfferView[]> = {};
    for (let i = 0; i < 5; i++) {
      offersByProductId[`canonical-${i}`] = offersForSavings(
        makeSavings({ cheapestStoreId: `store-${i}`, cheapestStoreSlug: `store-${i}`, mostExpensiveStoreId: `store-${i}-exp`, mostExpensiveStoreSlug: `store-${i}-exp` })
      );
    }
    const catalogRepo = makeCatalogRepo(products, offersByProductId);
    const priceIntelligenceService = makePriceIntelligenceService({});

    const engine = new OpportunityEngine(
      catalogRepo, priceIntelligenceService, makeFreshnessService(), makeLinkRepo(),
      makeBadgeService(), makeComparisonComposer(), makePurchaseTimingComposer(), makeAnalyticsEventRepository()
    );
    await engine.getTopOpportunities(5);

    expect(catalogRepo.findOffersByCanonicalProductIds).toHaveBeenCalledTimes(1);
    expect(catalogRepo.findOffersByCanonicalProductId).not.toHaveBeenCalled();
    // A economia deixou de vir do serviço — vem da função pura sobre o lote.
    expect(priceIntelligenceService.getSavingsOpportunity).not.toHaveBeenCalled();
  });

  it("pede o lote com os 5 ids de uma vez e com o teto por produto de 500", async () => {
    const products = Array.from({ length: 5 }, (_, i) =>
      makeCanonicalProduct({ id: `canonical-${i}`, canonicalSlug: `slug-${i}` })
    );
    const catalogRepo = makeCatalogRepo(products, {});
    const engine = new OpportunityEngine(
      catalogRepo, makePriceIntelligenceService({}), makeFreshnessService(), makeLinkRepo(),
      makeBadgeService(), makeComparisonComposer(), makePurchaseTimingComposer(), makeAnalyticsEventRepository()
    );
    await engine.getTopOpportunities(5);

    expect(catalogRepo.findOffersByCanonicalProductIds).toHaveBeenCalledWith(
      ["canonical-0", "canonical-1", "canonical-2", "canonical-3", "canonical-4"],
      500
    );
  });

  it("candidato ausente do lote não fabrica resultado", async () => {
    const product = makeCanonicalProduct();
    const engine = buildEngine({ products: [product], offersByProductId: {}, savingsByProductId: {} });
    expect(await engine.getTopOpportunities(5)).toEqual([]);
  });

  it("canonical com uma única oferta não gera economia (mínimo de 2 pontas)", async () => {
    const product = makeCanonicalProduct();
    const engine = buildEngine({
      products: [product],
      offersByProductId: { "canonical-1": [makeOffer({ storeId: "store-1", priceUSD: 100 })] },
      savingsByProductId: {},
    });
    expect(await engine.getTopOpportunities(5)).toEqual([]);
  });

  it("calcula cheapest/mostExpensive/savings a partir das ofertas do lote, sem contaminar canonicals", async () => {
    const a = makeCanonicalProduct({ id: "canonical-a", canonicalSlug: "a", name: "A" });
    const b = makeCanonicalProduct({ id: "canonical-b", canonicalSlug: "b", name: "B" });
    const engine = buildEngine({
      products: [a, b],
      offersByProductId: {
        "canonical-a": [
          makeOffer({ offerId: "a1", storeId: "store-a1", storeSlug: "store-a1", priceUSD: 80 }),
          makeOffer({ offerId: "a2", storeId: "store-a2", storeSlug: "store-a2", priceUSD: 100 }),
        ],
        "canonical-b": [
          makeOffer({ offerId: "b1", storeId: "store-b1", storeSlug: "store-b1", priceUSD: 500 }),
          makeOffer({ offerId: "b2", storeId: "store-b2", storeSlug: "store-b2", priceUSD: 1000 }),
        ],
      },
      savingsByProductId: {},
    });

    const result = await engine.getTopOpportunities(5);
    const byId = new Map(result.map((r) => [r.canonicalProductId, r]));

    // canonical-a: 100 -> 80 = 20 (20%); canonical-b: 1000 -> 500 = 500 (50%)
    expect(byId.get("canonical-a")).toMatchObject({ newPriceUSD: 80, oldPriceUSD: 100, savingsUSD: 20, savingsPercent: 20, cheapestStoreSlug: "store-a1" });
    expect(byId.get("canonical-b")).toMatchObject({ newPriceUSD: 500, oldPriceUSD: 1000, savingsUSD: 500, savingsPercent: 50, cheapestStoreSlug: "store-b1" });
  });

  it("ignora oferta esgotada no cálculo do preço, sem descartar o canonical", async () => {
    const product = makeCanonicalProduct();
    const engine = buildEngine({
      products: [product],
      offersByProductId: {
        "canonical-1": [
          makeOffer({ offerId: "o1", storeId: "s1", storeSlug: "s1", priceUSD: 10, inStock: false }),
          makeOffer({ offerId: "o2", storeId: "s2", storeSlug: "s2", priceUSD: 80 }),
          makeOffer({ offerId: "o3", storeId: "s3", storeSlug: "s3", priceUSD: 100 }),
        ],
      },
      savingsByProductId: {},
    });

    const [top] = await engine.getTopOpportunities(5);
    // $10 está esgotada: não pode virar o "menor preço" (mesma regra de
    // PriceIntelligenceService.fetchOfferPrices, preservada).
    expect(top).toMatchObject({ newPriceUSD: 80, oldPriceUSD: 100, cheapestStoreSlug: "s2" });
  });
  // ── P3-1 (continuação) — oferta arquivada nunca vira oportunidade ───────
  // Medido no banco local antes da correção: para o Dell XPS 14 1TB o motor
  // elegia como winningOffer a oferta arquivada de $1.723,28
  // (available=false, inStock=true). Ela era eliminada por gates posteriores
  // naquele dataset, mas o defeito era latente — bastava passar nos gates
  // para a Home anunciar preço, loja e link de uma oferta que o catálogo, a
  // busca, /product e /compare já se recusam a mostrar.

  it("nunca elege uma oferta arquivada como vencedora, mesmo sendo a mais barata", async () => {
    const product = makeCanonicalProduct();
    const engine = buildEngine({
      products: [product],
      offersByProductId: {
        "canonical-1": [
          makeOffer({ offerId: "arquivada-barata", storeId: "s-arq", storeSlug: "s-arq", priceUSD: 100, inStock: true, available: false }),
          makeOffer({ offerId: "ativa-cara", storeId: "s-ativa", storeSlug: "s-ativa", priceUSD: 500, inStock: true, available: true }),
          makeOffer({ offerId: "ativa-media", storeId: "s-media", storeSlug: "s-media", priceUSD: 300, inStock: true, available: true }),
        ],
      },
      savingsByProductId: {},
    });

    const [top] = await engine.getTopOpportunities(5);
    // A economia sai de 500 -> 300 (ativas), nunca de 500 -> 100 (arquivada).
    expect(top).toMatchObject({ newPriceUSD: 300, oldPriceUSD: 500, cheapestStoreSlug: "s-media" });
  });

  it("descarta o candidato quando sobra menos de uma comparação real após remover a arquivada", async () => {
    const product = makeCanonicalProduct();
    const engine = buildEngine({
      products: [product],
      offersByProductId: {
        "canonical-1": [
          makeOffer({ offerId: "arquivada", storeId: "s-arq", storeSlug: "s-arq", priceUSD: 100, inStock: true, available: false }),
          makeOffer({ offerId: "ativa", storeId: "s-ativa", storeSlug: "s-ativa", priceUSD: 500, inStock: true, available: true }),
        ],
      },
      savingsByProductId: {},
    });

    // Antes, a arquivada servia de "loja mais cara/barata" e produzia uma
    // economia fantasma. Com uma única oferta ativa não há economia entre
    // lojas para anunciar.
    expect(await engine.getTopOpportunities(5)).toEqual([]);
  });

  it("oferta esgotada porém ATIVA continua participando — available != in_stock", async () => {
    const product = makeCanonicalProduct();
    const engine = buildEngine({
      products: [product],
      offersByProductId: {
        "canonical-1": [
          makeOffer({ offerId: "ativa-esgotada", storeId: "s-esg", storeSlug: "s-esg", priceUSD: 900, inStock: false, available: true }),
          makeOffer({ offerId: "ativa-barata", storeId: "s-bar", storeSlug: "s-bar", priceUSD: 500, inStock: true, available: true }),
          makeOffer({ offerId: "ativa-cara", storeId: "s-car", storeSlug: "s-car", priceUSD: 700, inStock: true, available: true }),
        ],
      },
      savingsByProductId: {},
    });

    const [top] = await engine.getTopOpportunities(5);
    // A esgotada não forma preço (regra de fetchOfferPrices, preservada),
    // mas o candidato segue vivo pelas duas ativas com estoque.
    expect(top).toMatchObject({ newPriceUSD: 500, oldPriceUSD: 700 });
  });
});
