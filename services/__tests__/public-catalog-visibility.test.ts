// P2 — PUBLIC CATALOG VISIBILITY
//
// Contrato canônico (obrigatório a partir desta sessão):
//
//   PUBLIC STORE   = stores.active = true
//   PUBLIC OFFER   = offers.available = true AND stores.active = true
//   PUBLIC PRODUCT = existe pelo menos uma PUBLIC OFFER
//
// `is_verified` NÃO faz parte do contrato.
//
// Incidente que originou o P2: duas lojas QA (`qa-e2e-store-a`/`-b`) com
// `stores.active = false` apareciam em /search, /lojas/[slug] e
// /product/[slug], e suas ofertas formavam preço/estoque/ranking públicos.
//
// Estes testes cobrem cada superfície pública (search, product detail,
// catálogo, related, lojas, home, compare/buyer intelligence) mais a
// contrapartida obrigatória: os caminhos INTERNOS (merchant/admin) continuam
// enxergando o que precisam.
//
// Os mocks são "chainables" e thenables, como o client do supabase-js, e
// registram as chamadas: assim é possível afirmar tanto o RESULTADO quanto o
// GATE aplicado na query.
const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockSnapshot = jest.fn();
const mockGetTopMovers = jest.fn();
const mockGetCategories = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// O client de service role existe para os fluxos server-only (merchant data).
// Aqui ele é roteado para o MESMO roteador de tabelas — nenhum teste toca rede.
jest.mock("@/lib/supabase/service", () => ({
  getSupabaseServiceClient: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}));

jest.mock("@/services/category.service", () => ({
  getCategories: () => mockGetCategories(),
  getCategoryBySlug: () => Promise.resolve(null),
  getCategoryById: () => Promise.resolve(null),
}));

jest.mock("@/lib/marketplace-operations-factory", () => ({
  createMarketplaceOperationsServices: () => ({
    metricsService: { snapshot: () => mockSnapshot() },
  }),
}));

jest.mock("@/lib/realtime-commerce-factory", () => ({
  createRealtimeCommerceServices: () => ({
    marketPulseService: { getTopMovers: (...args: unknown[]) => mockGetTopMovers(...args) },
  }),
}));

// `lib/home-premium-service.ts` importa o ConnectorDirectoryService, que
// carrega a cadeia de crawlers (ESM não transformável pelo Jest). Esse
// serviço não é exercitado aqui: basta não carregar a cadeia real.
jest.mock("@/lib/connector-directory-service", () => ({
  ConnectorDirectoryService: class {
    async listAll() {
      return [];
    }
  },
}));

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getStorePublic, getStoresRanking } from "../stores-public.service";
import { getOffers, getOffersByProduct, getOffersByStore } from "../offer.service";
import { getRelatedProducts, getProductBySlug, getProductsCatalog } from "../product.service";
import { getRelatedStores, getStoreBySlug, getStores } from "../store.service";
import { searchEverything } from "../search.service";
import { getHomeStats, getLiveMarketplaceFeed, getTopCategories } from "@/lib/home-premium-service";
import { getProductPriceIntelligence } from "../price-intelligence.service";
import { CompareFoundationService } from "@/src/domains/canonical-catalog/services/CompareFoundationService";
import { SupabaseCanonicalCatalogRepository } from "@/src/domains/canonical-catalog/infrastructure/SupabaseCanonicalCatalogRepository";
import { PriceIntelligenceService } from "@/src/domains/market-insights/services/PriceIntelligenceService";
import { VolatilityRollupService } from "@/src/domains/market-insights/services/VolatilityRollupService";

type ChainResult = { data?: unknown; error?: unknown; count?: number };

/** Cadeia encadeável e "thenable" (supabase-js), com as chamadas registradas. */
function makeChain(result: ChainResult) {
  const chain: Record<string, unknown> = { calls: [] as Array<[string, unknown[]]> };
  const methods = [
    "select", "eq", "neq", "in", "ilike", "not", "is", "gte", "lte", "order", "range", "limit",
  ];
  for (const method of methods) {
    chain[method] = jest.fn((...args: unknown[]) => {
      (chain.calls as Array<[string, unknown[]]>).push([method, args]);
      return chain;
    });
  }
  chain.single = jest.fn(() => Promise.resolve(result));
  chain.maybeSingle = jest.fn(() => Promise.resolve(result));
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

type Chain = ReturnType<typeof makeChain>;
type ChainMap = Record<string, Chain>;

function callsOf(chain: Chain): Array<[string, unknown[]]> {
  return chain.calls as Array<[string, unknown[]]>;
}

function hasCall(chain: Chain, method: string, column: string, value: unknown): boolean {
  return callsOf(chain).some(([m, a]) => m === method && a[0] === column && a[1] === value);
}

/** Toda cadeia criada (uma por chamada `from`) — a última por tabela fica em
 * `chains`; este registro acumula todas para os casos em que a MESMA tabela é
 * lida mais de uma vez. */
const everyChain: Array<{ table: string; chain: Chain }> = [];

/** Roteia `from(table)` para uma cadeia por tabela; tabelas não listadas
 * devolvem vazio (nunca `undefined`), como um select sem linhas. */
function routeFrom(tableResults: Record<string, ChainResult>): ChainMap {
  const chains: ChainMap = {};
  everyChain.length = 0;
  mockFrom.mockImplementation((table: string) => {
    const chain = makeChain(tableResults[table] ?? { data: [] });
    chains[table] = chain;
    everyChain.push({ table, chain });
    return chain;
  });
  return chains;
}

function chainsFor(table: string): Chain[] {
  return everyChain.filter((entry) => entry.table === table).map((entry) => entry.chain);
}

const INACTIVE_STORE = "store-inactive";
const ACTIVE_STORE = "store-active";

function offer(overrides: Record<string, unknown> = {}) {
  return {
    id: "offer-1",
    product_id: "product-1",
    store_id: ACTIVE_STORE,
    currency: "USD",
    price_usd: 100,
    price_brl: 500,
    old_price: null,
    in_stock: true,
    available: true,
    stock_quantity: null,
    condition: null,
    warranty: null,
    cashback: null,
    product_url: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

function searchProductRow(id: string, offers: Array<Record<string, unknown>>) {
  return {
    id,
    name: `Produto ${id}`,
    slug: id,
    description: "",
    brand_id: "brand-a",
    category_id: "category-1",
    image_url: null,
    specifications: null,
    created_at: "2026-08-01T00:00:00Z",
    brand: null,
    category: null,
    offers,
  };
}

beforeEach(() => {
  mockFrom.mockReset();
  mockRpc.mockReset();
  mockSnapshot.mockReset();
  mockGetTopMovers.mockReset();
  mockGetCategories.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC STORE
// ─────────────────────────────────────────────────────────────────────────────
describe("P2 — PUBLIC STORE (stores.active = true)", () => {
  it("(1) loja ativa é pública e suas métricas contam só ofertas disponíveis", async () => {
    const chains = routeFrom({
      stores: { data: { id: ACTIVE_STORE, slug: "loja-ativa", name: "Loja Ativa", active: true, rating: 5 } },
      merchant_stores: { data: null },
      offers: { data: [{ product_id: "p1" }, { product_id: "p1" }, { product_id: "p2" }], count: 3 },
    });

    const result = await getStorePublic("loja-ativa");

    expect(result).not.toBeNull();
    expect(result?.name).toBe("Loja Ativa");
    expect(result?.offerCount).toBe(3);
    expect(result?.productCount).toBe(2);
    expect(hasCall(chains.stores, "eq", "active", true)).toBe(true);
    // Métricas públicas da loja: `available=true` na leitura de ofertas.
    expect(hasCall(chains.offers, "eq", "available", true)).toBe(true);
    expect(callsOf(chains.offers)).toContainEqual(["eq", ["store_id", ACTIVE_STORE]]);
  });

  it("(2)/(3) loja inativa → getStorePublic devolve null (a query exige active=true)", async () => {
    const chains = routeFrom({
      stores: { data: null, error: { message: "no rows returned" } },
    });

    const result = await getStorePublic("qa-e2e-store-a");

    expect(result).toBeNull();
    const calls = callsOf(chains.stores);
    expect(calls).toContainEqual(["eq", ["slug", "qa-e2e-store-a"]]);
    expect(calls).toContainEqual(["eq", ["active", true]]);
  });

  it("(4) getStoresRanking só considera loja ativa e oferta disponível", async () => {
    const chains = routeFrom({
      stores: { data: [{ id: ACTIVE_STORE, slug: "loja-ativa", name: "Loja Ativa", active: true, rating: 5 }] },
      merchant_stores: { data: [] },
      offers: { data: [{ store_id: ACTIVE_STORE }] },
    });

    const ranking = await getStoresRanking(30);

    expect(ranking.map((s) => s.id)).toEqual([ACTIVE_STORE]);
    expect(hasCall(chains.stores, "eq", "active", true)).toBe(true);
    expect(hasCall(chains.offers, "eq", "available", true)).toBe(true);
  });

  it("(1)/(4) services/store.service.ts (superfícies públicas) exige active=true", async () => {
    routeFrom({
      stores: { data: [{ id: ACTIVE_STORE, slug: "loja-ativa", name: "Loja Ativa", active: true, rating: 5 }] },
    });

    await getStores();
    await getStoreBySlug("loja-ativa");
    await getRelatedStores(ACTIVE_STORE, 3);

    // As três leituras públicas (getStores, getStoreBySlug, getRelatedStores)
    // passaram pelo mesmo gate `active=true`.
    const storeReads = chainsFor("stores");
    expect(storeReads).toHaveLength(3);
    expect(storeReads.every((chain) => hasCall(chain, "eq", "active", true))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC OFFER
// ─────────────────────────────────────────────────────────────────────────────
describe("P2 — PUBLIC OFFER (offers.available = true AND stores.active = true)", () => {
  it("(5) oferta disponível de loja ativa é pública", async () => {
    routeFrom({
      offers: { data: [offer({ id: "o-active", store: { id: ACTIVE_STORE, active: true } })] },
    });

    const result = await getOffersByProduct("product-1");

    expect(result.map((o) => o.id)).toEqual(["o-active"]);
  });

  it("(6) oferta disponível de loja INATIVA não é pública", async () => {
    routeFrom({
      offers: {
        data: [offer({ id: "o-inactive", store: { id: INACTIVE_STORE, active: false } })],
      },
    });

    const result = await getOffersByProduct("product-1");

    expect(result).toEqual([]);
  });

  it("(6) getOffersByStore(loja inativa) não devolve oferta pública", async () => {
    routeFrom({
      offers: { data: [offer({ stores: { active: false } })] },
    });

    expect(await getOffersByStore(INACTIVE_STORE)).toEqual([]);
  });

  it("(7)/(CASO C) oferta arquivada (available=false) nunca é a fonte do preço — a elegibilidade exige available=true", async () => {
    // O gate de `available` é resolvido pelo banco (ADR-008): o serviço não
    // reabre a arquivada em memória, e o contrato testado aqui é o da QUERY.
    // Sem `.eq("available", true)` uma oferta arquivada voltaria a formar
    // preço público — é exatamente o que o CASO C proíbe.
    const chains = routeFrom({
      offers: { data: [offer({ id: "o-public", store: { id: ACTIVE_STORE, active: true } })] },
    });

    const result = await getOffersByProduct("product-1");

    expect(hasCall(chains.offers, "eq", "available", true)).toBe(true);
    expect(result.map((o) => o.id)).toEqual(["o-public"]);
  });

  it("(7) nenhuma oferta pública é devolvida sem `available=true` na leitura de loja", async () => {
    const chains = routeFrom({
      offers: { data: [offer({ id: "o-public", stores: { active: true } })] },
    });

    await getOffersByStore(ACTIVE_STORE);

    expect(hasCall(chains.offers, "eq", "available", true)).toBe(true);
    expect(hasCall(chains.offers, "eq", "store_id", ACTIVE_STORE)).toBe(true);
  });

  it("(16) caminho interno continua sem gate: getOffers() devolve o que existe", async () => {
    routeFrom({
      offers: { data: [offer({ id: "o-1", store_id: INACTIVE_STORE })] },
    });

    const result = await getOffers();

    expect(result.map((o) => o.id)).toEqual(["o-1"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC PRODUCT (detail page)
// ─────────────────────────────────────────────────────────────────────────────
describe("P2 — PUBLIC PRODUCT (/product/[slug])", () => {
  it("(11) produto cujas ofertas vêm TODAS de loja inativa → não é público", async () => {
    routeFrom({
      products: {
        data: {
          id: "product-1",
          slug: "qa-e2e-product-005",
          name: "QA E2E 005",
          offers: [{ store: { active: false } }],
        },
      },
    });

    expect(await getProductBySlug("qa-e2e-product-005")).toBeNull();
  });

  it("(12) produto com oferta de loja ativa É público (mesmo com oferta de loja inativa no meio)", async () => {
    routeFrom({
      products: {
        data: {
          id: "product-1",
          slug: "produto-misto",
          name: "Produto Misto",
          offers: [{ store: { active: false } }, { store: { active: true } }],
        },
      },
    });

    const result = await getProductBySlug("produto-misto");

    expect(result).not.toBeNull();
    expect(result?.slug).toBe("produto-misto");
  });

  it("(11) produto sem PUBLIC OFFER não resolve: a query é inner-join em available=true", async () => {
    const chains = routeFrom({ products: { data: null, error: { message: "no rows" } } });

    const result = await getProductBySlug("produto-sem-oferta-publica");

    expect(result).toBeNull();
    const calls = callsOf(chains.products);
    expect(calls).toContainEqual(["eq", ["offers.available", true]]);
    expect(calls.some(([m, a]) => m === "select" && String(a[0]).includes("offers!inner"))).toBe(true);
  });

  it("(12) ofertas públicas do detalhe excluem a loja inativa (mesmo com preço menor)", async () => {
    routeFrom({
      offers: {
        data: [
          offer({ id: "o-cheap-inactive", price_usd: 10, store: { id: INACTIVE_STORE, active: false } }),
          offer({ id: "o-public", price_usd: 900, store: { id: ACTIVE_STORE, active: true } }),
        ],
      },
    });

    const result = await getOffersByProduct("product-1");

    expect(result.map((o) => o.id)).toEqual(["o-public"]);
    expect(result.map((o) => o.price_usd)).toEqual([900]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RELATED / CATALOG
// ─────────────────────────────────────────────────────────────────────────────
describe("P2 — related products e catálogo público", () => {
  it("(13) related não inclui candidato sem PUBLIC OFFER", async () => {
    const chains = routeFrom({
      products: {
        data: [
          { id: "candidate-public", name: "Público", slug: "c-public", brand_id: "brand-a", category_id: "category-1" },
          { id: "candidate-inactive", name: "Inativa", slug: "c-inactive", brand_id: "brand-a", category_id: "category-1" },
          { id: "candidate-no-offer", name: "Sem oferta", slug: "c-no", brand_id: "brand-a", category_id: "category-1" },
        ],
      },
      offers: {
        data: [
          { product_id: "reference", price_usd: 1000 },
          { product_id: "candidate-public", price_usd: 980 },
        ],
      },
    });

    const result = await getRelatedProducts(
      { id: "reference", name: "Ref", slug: "reference", brand_id: "brand-a", category_id: "category-1" } as never,
      4
    );

    expect(result.map((p) => p.id)).toEqual(["candidate-public"]);
    expect(hasCall(chains.offers, "eq", "available", true)).toBe(true);
    expect(hasCall(chains.offers, "eq", "stores.active", true)).toBe(true);
  });

  it("(13) catálogo padrão: o conjunto vem da RPC (PUBLIC PRODUCTS) — linha extra do PostgREST é ignorada", async () => {
    // A RPC — que aplica available + stores.active ANTES de agregar — é a
    // fonte única de elegibilidade, `total_count` e paginação. `p-inactive`
    // (única oferta de loja inativa) não está na lista, então não aparece nem
    // como linha extra devolvida pelo PostgREST.
    mockRpc.mockResolvedValue({
      data: [
        { product_id: "p-mixed", lowest_price_usd: 950, has_stock: true, total_count: 2 },
        { product_id: "p-public", lowest_price_usd: 900, has_stock: true, total_count: 2 },
      ],
    });
    routeFrom({
      products: {
        data: [
          searchProductRow("p-mixed", [
            // MENOR preço, de loja INATIVA: não pode ser anunciado.
            { price_usd: 10, in_stock: false, stores: { active: false } },
            { price_usd: 950, in_stock: true, stores: { active: true } },
          ]),
          searchProductRow("p-public", [{ price_usd: 900, in_stock: true, stores: { active: true } }]),
          searchProductRow("p-inactive", [{ price_usd: 5, in_stock: true, stores: { active: false } }]),
        ],
        count: 3,
      },
      categories: { data: [] },
      brands: { data: [] },
    });

    const result = await getProductsCatalog({ sort: "newest" });

    expect(result.products.map((p) => p.id)).toEqual(["p-mixed", "p-public"]);
    expect(result.total).toBe(2);
    const mixed = result.products.find((p) => p.id === "p-mixed");
    expect(mixed?.lowestPriceUSD).toBe(950);
    expect(mixed?.inStock).toBe(true);
  });

  it("(1) produto só com oferta de loja inativa: fora do resultado E fora do total_count", async () => {
    // A elegibilidade é do SQL (INNER JOIN stores s ... s.active = true em
    // `filtered_offers`, antes de `count(*) OVER ()`): o produto não entra na
    // lista da RPC nem no total. O `count: 3` do PostgREST existe para provar
    // que ele NÃO é a fonte da contagem.
    mockRpc.mockResolvedValue({
      data: [{ product_id: "p-public", lowest_price_usd: 900, has_stock: true, total_count: 1 }],
    });
    routeFrom({
      products: {
        data: [
          searchProductRow("p-public", [{ price_usd: 900, in_stock: true, stores: { active: true } }]),
          searchProductRow("qa-e2e-product-005", [{ price_usd: 5, in_stock: true, stores: { active: false } }]),
          searchProductRow("p-sem-oferta", []),
        ],
        count: 3,
      },
      categories: { data: [] },
      brands: { data: [] },
    });

    const result = await getProductsCatalog({ sort: "newest" });

    expect(result.products.map((p) => p.id)).toEqual(["p-public"]);
    expect(result.total).toBe(1);
    expect(result.products.some((p) => p.id === "qa-e2e-product-005")).toBe(false);
  });

  it("(3) oferta indisponível em loja ativa não torna o produto público nem incrementa o total", async () => {
    mockRpc.mockResolvedValue({
      data: [{ product_id: "p-public", lowest_price_usd: 900, has_stock: true, total_count: 1 }],
    });
    routeFrom({
      products: {
        data: [
          searchProductRow("p-public", [{ price_usd: 900, in_stock: true, stores: { active: true } }]),
          // `available = false` em loja ATIVA: não forma PUBLIC OFFER.
          searchProductRow("p-arquivado", [
            { price_usd: 5, in_stock: true, available: false, stores: { active: true } },
          ]),
        ],
        count: 2,
      },
      categories: { data: [] },
      brands: { data: [] },
    });

    const result = await getProductsCatalog({ sort: "newest" });

    expect(result.products.map((p) => p.id)).toEqual(["p-public"]);
    expect(result.total).toBe(1);
  });

  it("(4) paginação do sort padrão é limitada pelos PUBLIC PRODUCTS da RPC (sem página curta)", async () => {
    // 25 PUBLIC PRODUCTS: a página 3 (offset 24) traz exatamente 1 item.
    // Produtos invisíveis no PostgREST não podem "preencher" nem encurtar a
    // página — o tamanho vem dos ids da RPC, não de um filtro posterior.
    mockRpc.mockResolvedValue({
      data: [{ product_id: "p25", lowest_price_usd: 10, has_stock: true, total_count: 25 }],
    });
    routeFrom({
      products: {
        data: [
          searchProductRow("p25", [{ price_usd: 10, in_stock: true, stores: { active: true } }]),
        ],
        count: 40, // PostgREST incluindo lojas inativas — nunca usado
      },
      categories: { data: [] },
      brands: { data: [] },
    });

    const result = await getProductsCatalog({ sort: "newest", page: 3, perPage: 12 });

    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(3);
    expect(result.products.map((p) => p.id)).toEqual(["p25"]);
    expect(mockRpc).toHaveBeenCalledWith(
      "search_products_catalog",
      expect.objectContaining({ p_sort: "newest", p_limit: 12, p_offset: 24 })
    );
  });

  it("(5) todos os sorts usam o MESMO caminho canônico (preço passa adiante; os demais caem em created_at)", async () => {
    const expectSortMappedTo = async (
      sort: "price_asc" | "price_desc" | "newest" | "relevance" | "best_selling" | "top_rated",
      expected: string
    ) => {
      mockRpc.mockReset();
      mockRpc.mockResolvedValue({
        data: [{ product_id: "p1", lowest_price_usd: 10, has_stock: true, total_count: 1 }],
      });
      routeFrom({
        products: {
          data: [searchProductRow("p1", [{ price_usd: 10, in_stock: true, stores: { active: true } }])],
          count: 1,
        },
      });

      await getProductsCatalog({ sort });

      expect(mockRpc).toHaveBeenCalledWith(
        "search_products_catalog",
        expect.objectContaining({ p_sort: expected })
      );
    };

    await expectSortMappedTo("price_asc", "price_asc");
    await expectSortMappedTo("price_desc", "price_desc");
    await expectSortMappedTo("newest", "newest");
    await expectSortMappedTo("relevance", "relevance");
    await expectSortMappedTo("best_selling", "best_selling");
    await expectSortMappedTo("top_rated", "top_rated");
  });

  it("(FIX 1) storeSlug de loja inativa → catálogo vazio, e a RPC NÃO executa uma consulta sem filtro", async () => {
    // `getStoreBySlug` devolve null para loja inativa. Antes desta correção o
    // filtro era descartado em silêncio (`p_store_id: null`) e a RPC devolvia o
    // catálogo INTEIRO. Agora: zero produtos, total 0, estado vazio coerente.
    routeFrom({ stores: { data: null, error: { message: "no rows returned" } } });

    const result = await getProductsCatalog({ storeSlug: "qa-e2e-store-a" });

    expect(result).toEqual({ products: [], total: 0, page: 1, perPage: 12, totalPages: 1 });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("(FIX 1) storeSlug de loja inativa preserva a página pedida e o perPage", async () => {
    routeFrom({ stores: { data: null, error: { message: "no rows returned" } } });

    const result = await getProductsCatalog({ storeSlug: "qa-e2e-store-a", page: 3, perPage: 24 });

    expect(result).toEqual({ products: [], total: 0, page: 3, perPage: 24, totalPages: 1 });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("(FIX 1) storeSlug de loja ATIVA continua filtrando normalmente (comportamento público intacto)", async () => {
    mockRpc.mockResolvedValue({
      data: [{ product_id: "p1", lowest_price_usd: 10, has_stock: true, total_count: 1 }],
    });
    routeFrom({
      stores: {
        data: { id: ACTIVE_STORE, slug: "loja-ativa", name: "Loja Ativa", active: true, rating: 5 },
      },
      products: {
        data: [searchProductRow("p1", [{ price_usd: 10, in_stock: true, stores: { active: true } }])],
        count: 1,
      },
    });

    const result = await getProductsCatalog({ storeSlug: "loja-ativa" });

    expect(result.products.map((p) => p.id)).toEqual(["p1"]);
    expect(mockRpc).toHaveBeenCalledWith(
      "search_products_catalog",
      expect.objectContaining({ p_store_id: ACTIVE_STORE })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────────────────────────────────────
describe("P2 — /search", () => {
  it("(8) produto cujas ofertas vêm todas de loja inativa não é retornado (fallback)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "Could not find the function" } });
    routeFrom({
      products: {
        data: [
          searchProductRow("qa-e2e-product-005", [{ price_usd: 100, in_stock: true, stores: { active: false } }]),
        ],
      },
    });

    const result = await searchEverything("QA E2E");

    expect(result.products).toEqual([]);
  });

  it("(8) produto sem nenhuma oferta não é público", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "Could not find the function" } });
    routeFrom({
      products: { data: [searchProductRow("p-sem-oferta", [])] },
    });

    const result = await searchEverything("produto");

    expect(result.products).toEqual([]);
  });

  it("(9) busca mista: preço e disponibilidade saem SÓ das ofertas públicas", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "Could not find the function" } });
    routeFrom({
      products: {
        data: [
          searchProductRow("p-mixed", [
            // mais barata, mas de loja INATIVA → não pode formar preço
            { price_usd: 10, in_stock: true, store_id: INACTIVE_STORE, stores: { active: false } },
            // pública e esgotada → forma o preço, mas não pode marcar estoque
            { price_usd: 120, in_stock: false, store_id: ACTIVE_STORE, stores: { active: true } },
          ]),
          searchProductRow("p-public", [
            { price_usd: 300, in_stock: true, store_id: ACTIVE_STORE, stores: { active: true } },
          ]),
        ],
      },
    });

    const result = await searchEverything("produto");

    expect(result.products.map((p) => p.id)).toEqual(["p-public", "p-mixed"]);
    const mixed = result.products.find((p) => p.id === "p-mixed");
    expect(mixed?.lowestPriceUSD).toBe(120);
    expect(mixed?.inStock).toBe(false);
    expect(mixed?.lowestPriceStoreId).toBe(ACTIVE_STORE);
  });

  it("(9) o mesmo gate vale no caminho da RPC (ordenação global no banco)", async () => {
    mockRpc.mockResolvedValue({
      data: [
        { product_id: "p-inactive", has_stock: true, total_count: 2 },
        { product_id: "p-public", has_stock: true, total_count: 2 },
      ],
    });
    routeFrom({
      products: {
        data: [
          searchProductRow("p-inactive", [{ price_usd: 10, in_stock: true, stores: { active: false } }]),
          searchProductRow("p-public", [{ price_usd: 300, in_stock: true, stores: { active: true } }]),
        ],
      },
    });

    const result = await searchEverything("produto");

    expect(result.products.map((p) => p.id)).toEqual(["p-public"]);
  });

  it("(10) searchEverything não retorna loja inativa", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const chains = routeFrom({
      stores: { data: [{ id: ACTIVE_STORE, slug: "loja-ativa", name: "Loja Ativa", active: true }] },
      products: { data: [] },
    });

    const result = await searchEverything("QA E2E");

    expect(hasCall(chains.stores, "eq", "active", true)).toBe(true);
    expect(result.stores.map((s) => s.id)).toEqual([ACTIVE_STORE]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HOME / CATEGORIAS
// ─────────────────────────────────────────────────────────────────────────────
describe("P2 — Home/Categorias", () => {
  it("(14) getHomeStats conta só lojas ativas e ofertas públicas", async () => {
    mockSnapshot.mockResolvedValue({ stores: 11, products: 500, offers: 900, categories: 9 });

    const client = {
      from: (table: string) =>
        table === "stores"
          ? makeChain({ data: [{ id: ACTIVE_STORE }, { id: "store-active-2" }] })
          : makeChain({ data: [{ product_id: "p1" }, { product_id: "p1" }, { product_id: "p2" }] }),
    };

    const stats = await getHomeStats(client as never);

    expect(stats.stores).toBe(2);
    expect(stats.products).toBe(2);
    expect(stats.offers).toBe(3);
    expect(stats.categories).toBe(9);
  });

  it("(14) /categorias conta só PUBLIC OFFER / PUBLIC PRODUCT", async () => {
    mockGetCategories.mockResolvedValue([{ id: "c1", name: "Eletrônicos", slug: "eletronicos", icon: null }]);

    const client = {
      from: () =>
        makeChain({
          data: [
            { product_id: "p1", products: { category_id: "c1" }, stores: { active: true } },
            { product_id: "p1", products: { category_id: "c1" }, stores: { active: true } },
            { product_id: "p2", products: { category_id: "c1" }, stores: { active: false } },
          ],
        }),
    };

    const categories = await getTopCategories(client as never);

    expect(categories).toHaveLength(1);
    expect(categories[0].productCount).toBe(1);
    expect(categories[0].offerCount).toBe(2);
  });

  it("(14) ticker público não nomeia mudança de loja inativa", async () => {
    mockGetTopMovers.mockResolvedValue([
      {
        productId: "p1",
        productName: "QA E2E 005",
        storeId: INACTIVE_STORE,
        storeName: "QA E2E Store A",
        previousValue: "10",
        currentValue: "8",
        percentChange: -0.2,
        changeType: "price_decreased",
        detectedAt: "2026-09-10T10:00:00Z",
      },
      {
        productId: "p2",
        productName: "Produto Real",
        storeId: ACTIVE_STORE,
        storeName: "Loja Ativa",
        previousValue: "20",
        currentValue: "18",
        percentChange: -0.1,
        changeType: "price_decreased",
        detectedAt: "2026-09-10T09:00:00Z",
      },
    ]);

    const client = {
      from: (table: string) =>
        makeChain(table === "stores" ? { data: [{ id: ACTIVE_STORE }] } : { data: [] }),
    };

    const feed = await getLiveMarketplaceFeed(client as never);

    expect(feed.map((entry) => entry.productName)).toEqual(["Produto Real"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPARE / BUYER INTELLIGENCE
// ─────────────────────────────────────────────────────────────────────────────
describe("P2 — compare / buyer intelligence", () => {
  it("(15) oferta de loja inativa não participa do ranking, do menor preço nem do total comparado", async () => {
    const canonicalProduct = { id: "cp-1", canonicalSlug: "jbl-charge-6", name: "JBL Charge 6" };
    const offers = [
      { offerId: "o-public", productId: "p1", storeId: ACTIVE_STORE, priceUSD: 900, available: true, storeActive: true, inStock: true },
      // Mais barata de todas — e de loja INATIVA.
      { offerId: "o-inactive", productId: "p1", storeId: INACTIVE_STORE, priceUSD: 10, available: true, storeActive: false, inStock: true },
      { offerId: "o-archived", productId: "p1", storeId: ACTIVE_STORE, priceUSD: 500, available: false, storeActive: true, inStock: true },
    ];

    const catalogRepo = {
      findOffersByCanonicalProductId: jest.fn().mockResolvedValue({ items: offers, count: offers.length }),
    };
    const canonicalProductService = { getBySlug: jest.fn().mockResolvedValue(canonicalProduct) };
    const rankingService = {
      rank: jest.fn((inputs: Array<{ offer: { offerId: string } }>) =>
        inputs.map((input, index) => ({
          offer: input.offer,
          rank: index + 1,
          rankScore: 100 - index,
          factors: [],
        }))
      ),
    };
    const priceHistoryService = {
      getAggregatedPriceHistory: jest.fn().mockResolvedValue({}),
    };

    const service = new CompareFoundationService(
      canonicalProductService as never,
      catalogRepo as never,
      rankingService as never,
      priceHistoryService as never
    );

    const result = await service.getForSlug("jbl-charge-6", () => true);

    const rankedOfferIds = rankingService.rank.mock.calls[0][0].map((input) => input.offer.offerId);
    expect(rankedOfferIds).toEqual(["o-public"]);
    expect(priceHistoryService.getAggregatedPriceHistory).toHaveBeenCalledWith("cp-1", [900]);
    expect(result?.totalOffers).toBe(1);
  });

  it("(15) o repositório transporta stores.active → storeActive, e o preço do domínio ignora a loja inativa", async () => {
    // Cadeia real: repositório (mapeamento real de `stores.active`) →
    // PriceIntelligenceService (o gate do domínio). Sem o transporte, o
    // serviço não teria como saber que a oferta de $5 vem de loja inativa.
    const offerRow = (overrides: Record<string, unknown>) => ({
      product_id: "p1",
      in_stock: true,
      available: true,
      stock_quantity: null,
      updated_at: "2026-09-01T00:00:00Z",
      condition: null,
      warranty: null,
      product_url: null,
      ...overrides,
    });

    const client = {
      from: () =>
        makeChain({
          data: [
            offerRow({ id: "o-ativa", store_id: "s-active", price_usd: 10, stores: { slug: "a", active: true } }),
            offerRow({ id: "o-inativa", store_id: "s-inactive", price_usd: 5, stores: { slug: "b", active: false } }),
          ],
          count: 2,
        }),
    };

    const repo = new SupabaseCanonicalCatalogRepository(client as never);
    const { items } = await repo.findOffersByCanonicalProductId("cp1", { limit: 10, offset: 0 });

    expect(items.map((item) => item.storeActive)).toEqual([true, false]);

    const statistics = await new PriceIntelligenceService(repo).getStatistics("cp1");

    // $5 (loja inativa) não é o menor preço nem conta como loja.
    expect(statistics?.lowestPriceUSD).toBe(10);
    expect(statistics?.storeCount).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MIGRATION (forward-only) — as RPCs públicas são o outro lado do contrato
// ─────────────────────────────────────────────────────────────────────────────
describe("P2 — RPCs públicas (migration forward-only)", () => {
  const migration = "supabase/migrations/20260916120000_public_catalog_visibility.sql";

  function readMigration(): string {
    return readFileSync(join(process.cwd(), migration), "utf8");
  }

  it("(8)/(9) as duas RPCs públicas. tornam a loja ativa elegível no próprio conjunto", () => {
    const sql = readMigration();

    // Uma ocorrência por função — search_products_catalog e search_products_global.
    const gatedJoins = sql.match(/JOIN stores s ON s\.id = o\.store_id AND s\.active = true/g) ?? [];
    expect(gatedJoins).toHaveLength(2);
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.search_products_catalog");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.search_products_global");
  });

  it("preserva assinatura, SECURITY INVOKER, GRANTs e COMMENT das RPCs vivas", () => {
    const sql = readMigration();

    // Uma por definição (a terceira menção do arquivo está no cabeçalho
    // explicativo, não no corpo de uma função).
    expect(sql.match(/^SECURITY INVOKER$/gm)?.length).toBe(2);
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.search_products_catalog");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.search_products_global");
    expect(sql.match(/^COMMENT ON FUNCTION/gm)?.length).toBe(2);
    // Migration nova e forward-only: nunca ALTER/DROP da definição histórica.
    expect(sql).not.toMatch(/DROP FUNCTION/);
    // Assinatura/retorno de search_products_catalog inalterados.
    expect(sql).toContain("p_sort          text    DEFAULT 'price_asc',");
    expect(sql).toContain("total_count      bigint");
  });

  it("(1)(3)(4) elegibilidade ANTES do count: agregado da RPC vem do INNER JOIN em stores.active", () => {
    const sql = readMigration();

    // `filtered_offers` (já com o INNER JOIN de loja ativa) precede
    // `product_price` (agregação) e o `count(*) OVER ()` — ou seja, o total e
    // os limites de página contam apenas PUBLIC OFFERS/PUBLIC PRODUCTS.
    const gatedJoinAt = sql.indexOf("JOIN stores s ON s.id = o.store_id AND s.active = true");
    const aggregationAt = sql.indexOf("GROUP BY fo.product_id");
    const windowCountAt = sql.indexOf("count(*) OVER () AS total_count");

    expect(gatedJoinAt).toBeGreaterThan(-1);
    expect(aggregationAt).toBeGreaterThan(gatedJoinAt);
    expect(windowCountAt).toBeGreaterThan(aggregationAt);

    // PUBLIC PRODUCT no conjunto elegível: o produto entra por JOIN com o
    // agregado (sem LEFT JOIN de produto sem oferta pública).
    expect(sql).toContain("JOIN product_price pp ON pp.product_id = p.id");
    expect(sql).not.toMatch(/LEFT JOIN product_price/);
  });

  it("(5) o sort padrão tem chave própria de ordenação na RPC, preservando a ordem dos sorts de preço", () => {
    const sql = readMigration();

    // O sort padrão (`newest` e os modos sem coluna de apoio) ordena por
    // created_at com desempate determinístico por id...
    expect(sql).toContain("CASE WHEN p_sort IN ('price_asc','price_desc') THEN NULL ELSE c.created_at END DESC NULLS LAST");
    expect(sql).toContain("SELECT p.id, p.created_at, pp.lowest, COALESCE(pp.has_stock, false) AS has_stock");

    // ...e os sorts de preço mantêm as chaves originais (has_stock -> preço -> id).
    expect(sql).toContain("CASE WHEN p_sort IN ('price_asc','price_desc') THEN c.has_stock END DESC NULLS LAST");
    expect(sql).toContain("CASE WHEN p_sort = 'price_desc' THEN c.lowest END DESC NULLS LAST");
    expect(sql).toContain("CASE WHEN p_sort = 'price_asc'  THEN c.lowest END ASC  NULLS LAST");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FIX 2 — volatilidade / purchase timing (consumer intelligence)
// ─────────────────────────────────────────────────────────────────────────────
//
// Cadeia real auditada: `PurchaseTimingComposer.compose` tem exatamente dois
// colaboradores de I/O — `VolatilityRollupService.getCanonicalVolatility`
// (linha 180) e `ExchangeHistoryService.getRange` — e NÃO lê ofertas por conta
// própria: `priceAggregation`, `priceStatistics` e `offers` vêm do
// `ComparisonIntelligenceBundle` já gated. Logo a fronteira consumer mais
// próxima da fonte é `VolatilityRollupService.getCanonicalVolatility`, e é ali
// que o contrato PUBLIC OFFER é aplicado (antes de montar o conjunto pontuado).
describe("P2 — FIX 2: volatilidade/purchase timing só com PUBLIC OFFERS", () => {
  function arrangeVolatility(items: Array<Record<string, unknown>>) {
    const catalogRepo = {
      findOffersByCanonicalProductId: jest.fn().mockResolvedValue({ items, total: items.length }),
    };
    const scoredProductIds: string[] = [];
    const volatilityService = {
      computeForProduct: jest.fn(async (productId: string) => {
        scoredProductIds.push(productId);
        return { productId, score: 50, sampleSize: 3, classification: "Moderado" };
      }),
    };
    const service = new VolatilityRollupService(catalogRepo as never, volatilityService as never, {} as never);
    return { service, volatilityService, scoredProductIds };
  }

  it("oferta de loja inativa com histórico extremo NÃO entra no conjunto pontuado", async () => {
    const { service, scoredProductIds } = arrangeVolatility([
      { offerId: "o-public", productId: "p-public", storeId: ACTIVE_STORE, available: true, storeActive: true },
      // Loja inativa: se entrasse, puxaria a média para um score absurdo.
      { offerId: "o-inactive", productId: "p-inactive", storeId: INACTIVE_STORE, available: true, storeActive: false },
    ]);

    const profile = await service.getCanonicalVolatility("cp-1");

    expect(scoredProductIds).toEqual(["p-public"]);
    expect(profile).toEqual(
      expect.objectContaining({ canonicalProductId: "cp-1", score: 50, productsScored: 1 })
    );
  });

  it("conjunto só com ofertas não públicas → nenhuma inteligência consumer é produzida", async () => {
    const { service, volatilityService } = arrangeVolatility([
      { offerId: "o-1", productId: "p-inactive", storeId: INACTIVE_STORE, available: true, storeActive: false },
      { offerId: "o-2", productId: "p-archived", storeId: ACTIVE_STORE, available: false, storeActive: true },
    ]);

    await expect(service.getCanonicalVolatility("cp-1")).resolves.toBeNull();
    expect(volatilityService.computeForProduct).not.toHaveBeenCalled();
  });

  it("comportamento público intacto: oferta ativa de loja ativa continua pontuada", async () => {
    const { service, scoredProductIds } = arrangeVolatility([
      { offerId: "o-public", productId: "p-public", storeId: ACTIVE_STORE, available: true, storeActive: true },
    ]);

    const profile = await service.getCanonicalVolatility("cp-1");

    expect(scoredProductIds).toEqual(["p-public"]);
    expect(profile?.productsScored).toBe(1);
  });

  it("oferta arquivada (available=false) de loja ativa não torna o produto público na volatilidade", async () => {
    const { service, scoredProductIds } = arrangeVolatility([
      { offerId: "o-archived", productId: "p-archived", storeId: ACTIVE_STORE, available: false, storeActive: true },
    ]);

    await expect(service.getCanonicalVolatility("cp-1")).resolves.toBeNull();
    expect(scoredProductIds).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FIX 3 — histórico público de preço (/product/[slug] — PriceIntelligenceCard)
// ─────────────────────────────────────────────────────────────────────────────
describe("P2 — FIX 3: histórico de preço consumer exige loja ativa (no SQL)", () => {
  it("a leitura é INNER em stores(active) e filtra por offers.stores.active — sem filtro em JS após agregar", async () => {
    const chains = routeFrom({
      price_history: { data: [{ price_usd: 100, recorded_at: "2026-09-01T00:00:00Z" }] },
    });

    const result = await getProductPriceIntelligence("p1");

    const calls = callsOf(chains.price_history);
    const selectArg = String(calls.find(([method]) => method === "select")?.[1][0]);
    // Cadeia estrutural: price_history -> offers!inner -> stores!inner(active).
    expect(selectArg).toContain("offers!inner(");
    expect(selectArg).toContain("stores!inner(active)");
    // O filtro espelha o caminho de embeds e vale para a linha de price_history.
    expect(calls).toContainEqual(["eq", ["offers.product_id", "p1"]]);
    expect(calls).toContainEqual(["eq", ["offers.stores.active", true]]);
    // A agregação só recebe os pontos que o banco já devolveu filtrados.
    expect(result.series).toEqual([{ recordedAt: "2026-09-01T00:00:00Z", priceUSD: 100 }]);
  });

  it("histórico de loja não pública não forma série pública (o banco não devolve as linhas excluídas)", async () => {
    // Sem linha de loja ativa, o INNER join não devolve nada — o card recebe
    // série vazia em vez de uma estatística contaminada por loja inativa.
    routeFrom({ price_history: { data: [] } });

    const result = await getProductPriceIntelligence("p1");

    expect(result.series).toEqual([]);
  });

  it("erro de query continua degradando para série vazia (não lança)", async () => {
    routeFrom({ price_history: { data: null, error: { message: "boom" } } });

    const result = await getProductPriceIntelligence("p1");

    expect(result.series).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P2.1 — FAIL-CLOSED: ausência de evidência de loja ativa NÃO é público
// ─────────────────────────────────────────────────────────────────────────────
//
// Contrato: PUBLIC OFFER exige evidência POSITIVA (`stores.active === true`).
// Relacionamento ausente, `undefined`, `null`, array vazio ou malformado nunca
// concede visibilidade pública. Antes do P2.1 os helpers faziam
// `store ? store.active === true : true` (fail-open) — foi esse default que
// deixou a oferta de loja inativa sobreviver quando o embed `stores(active)`
// voltava vazio/anulado pelo filtro de dois níveis do PostgREST.
describe("P2.1 — fail-closed: loja ausente/nula/vazia/malformed nunca é pública", () => {
  type StoreShape = "absent" | "explicit-undefined" | "null" | "empty-array" | "active-null" | "malformed";

  /** Oferta com o relacionamento `stores` em cada forma observável. */
  function offerWithStoreShape(shape: StoreShape): Record<string, unknown> {
    const base: Record<string, unknown> = { price_usd: 100, in_stock: true };
    switch (shape) {
      case "absent":
        return base; // chave ausente
      case "explicit-undefined":
        return { ...base, stores: undefined };
      case "null":
        return { ...base, stores: null };
      case "empty-array":
        return { ...base, stores: [] };
      case "active-null":
        return { ...base, stores: { active: null } };
      case "malformed":
        return { ...base, stores: "broken-relationship" };
    }
  }

  const NON_PUBLIC_SHAPES: StoreShape[] = [
    "absent",
    "explicit-undefined",
    "null",
    "empty-array",
    "active-null",
    "malformed",
  ];

  // ── /search (caminho legado, que é onde o vazamento de loja inativa ocorreu)
  it.each(NON_PUBLIC_SHAPES)("busca: oferta com `stores` %s não é pública", async (shape) => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "Could not find the function" } });
    routeFrom({
      products: { data: [searchProductRow("p1", [offerWithStoreShape(shape)])] },
    });

    const result = await searchEverything("produto");

    expect(result.products).toEqual([]);
  });

  it("busca: evidência positiva (loja ativa) continua pública — objeto e array", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "Could not find the function" } });
    routeFrom({
      products: {
        data: [
          searchProductRow("p-object", [{ price_usd: 100, in_stock: true, stores: { active: true } }]),
          searchProductRow("p-array", [{ price_usd: 200, in_stock: true, stores: [{ active: true }] }]),
        ],
      },
    });

    const result = await searchEverything("produto");

    expect(result.products.map((p) => p.id)).toEqual(["p-object", "p-array"]);
  });

  it("busca: array com loja NÃO ativa não é público (array não é evidência por si)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "Could not find the function" } });
    routeFrom({
      products: {
        data: [
          searchProductRow("p1", [{ price_usd: 100, in_stock: true, stores: [{ active: false }] }]),
        ],
      },
    });

    const result = await searchEverything("produto");

    expect(result.products).toEqual([]);
  });

  // ── /products (linhas da página devolvidas pelo PostgREST)
  it.each(NON_PUBLIC_SHAPES)("catálogo: linha com oferta de `stores` %s é descartada", async (shape) => {
    mockRpc.mockResolvedValue({
      data: [
        { product_id: "p-public", lowest_price_usd: 100, has_stock: true, total_count: 1 },
        { product_id: "p-missing-store", lowest_price_usd: 50, has_stock: true, total_count: 1 },
      ],
    });
    routeFrom({
      products: {
        data: [
          searchProductRow("p-public", [{ price_usd: 100, in_stock: true, stores: { active: true } }]),
          searchProductRow("p-missing-store", [offerWithStoreShape(shape)]),
        ],
        count: 2,
      },
    });

    const result = await getProductsCatalog({ sort: "newest" });

    expect(result.products.map((p) => p.id)).toEqual(["p-public"]);
  });

  it("catálogo: evidência positiva continua pública e forma preço/estoque", async () => {
    mockRpc.mockResolvedValue({
      data: [{ product_id: "p1", lowest_price_usd: 90, has_stock: true, total_count: 1 }],
    });
    routeFrom({
      products: {
        data: [searchProductRow("p1", [{ price_usd: 90, in_stock: true, stores: { active: true } }])],
        count: 1,
      },
    });

    const result = await getProductsCatalog({ sort: "newest" });

    expect(result.products.map((p) => p.id)).toEqual(["p1"]);
    expect(result.products[0].lowestPriceUSD).toBe(90);
    expect(result.products[0].inStock).toBe(true);
  });

  // ── Produtor do Canonical Catalog (`storeActive` = evidência positiva)
  it.each(NON_PUBLIC_SHAPES)("canonical: linha com `stores` %s produz storeActive=false", async (shape) => {
    const client = {
      from: () =>
        makeChain({
          data: [{ id: "o1", product_id: "p1", store_id: "s1", price_usd: 10, in_stock: true, available: true, stock_quantity: null, updated_at: "x", condition: null, warranty: null, product_url: null, ...offerWithStoreShape(shape) }],
          count: 1,
        }),
    };

    const { items } = await new SupabaseCanonicalCatalogRepository(client as never).findOffersByCanonicalProductId(
      "cp1",
      { limit: 10, offset: 0 }
    );

    expect(items.map((item) => item.storeActive)).toEqual([false]);
  });

  it("canonical: `stores.active=true` produz storeActive=true (e false produz false)", async () => {
    const row = (active: boolean | null) => ({
      id: `o-${String(active)}`,
      product_id: "p1",
      store_id: "s1",
      price_usd: 10,
      in_stock: true,
      available: true,
      stock_quantity: null,
      updated_at: "x",
      condition: null,
      warranty: null,
      product_url: null,
      stores: { slug: "s", active },
    });
    const client = { from: () => makeChain({ data: [row(true), row(false), row(null)], count: 3 }) };

    const { items } = await new SupabaseCanonicalCatalogRepository(client as never).findOffersByCanonicalProductId(
      "cp1",
      { limit: 10, offset: 0 }
    );

    expect(items.map((item) => item.storeActive)).toEqual([true, false, false]);
  });

  // ── Detail page de oferta (já fail-closed antes do P2.1 — regressão travada)
  it("detalhe: oferta com `store: null` não é pública", async () => {
    routeFrom({ offers: { data: [offer({ id: "o-null-store", store: null })] } });

    expect(await getOffersByProduct("product-1")).toEqual([]);
  });
});
