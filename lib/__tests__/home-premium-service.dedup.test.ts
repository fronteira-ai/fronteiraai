import type { SupabaseClient } from "@supabase/supabase-js";

// lib/home-premium-service → factories / @/services/store.service →
// @/lib/supabase → @/lib/env: env obrigatórias antes do import dinâmico no
// beforeAll (env.ts lança se ausentes). Mesmo padrão de
// utils/__tests__/useSearch.interaction.test.tsx.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// ── Por que o mock de `react` ────────────────────────────────────────────────
//
// `cache()` é o memo de ESCOPO DE REQUISIÇÃO do React. O build que o Next usa
// no RSC é `react-server` (node_modules/react/cjs/react.react-server.*.js),
// onde `cache` realmente memoiza — mas SÓ quando existe um dispatcher de
// render (`ReactSharedInternals.A`); fora de um render, e no build client/node
// que o Jest carrega por padrão (node_modules/react/cjs/react.development.js),
// `cache` é um pass-through:
//
//     exports.cache = function (fn) {
//       return function () { return fn.apply(null, arguments); };
//     };
//
// Logo, em Jest, chamar as funções reais do módulo NUNCA deduplicaria e o
// teste não provaria nada. O mock abaixo replica a semântica do build
// `react-server` (valor memoizado por boundary, chaveado pelo argumento) de
// forma SIMPLIFICADA para as aridades que este módulo usa (0 ou 1 argumento).
// O que se prova aqui é o WIRING — todos os consumidores passam por UM ÚNICO
// boundary memoizado — e a memoização em si é comportamento documentado do
// React no RSC, o mesmo mecanismo já usado por app/product/[slug]/_cache.ts,
// app/search/_cache.ts e app/lojas/[slug]/_cache.ts.
jest.mock("react", () => {
  const actual = jest.requireActual("react") as Record<string, unknown>;
  const EMPTY_ARGS = Symbol("empty-args");
  const stores = new WeakMap<
    object,
    { objects: WeakMap<object, unknown>; primitives: Map<unknown, unknown> }
  >();

  function cache<T extends (...args: never[]) => unknown>(fn: T): T {
    return function (...args: unknown[]) {
      const fnKey = fn as unknown as object;
      let store = stores.get(fnKey);
      if (!store) {
        store = { objects: new WeakMap(), primitives: new Map() };
        stores.set(fnKey, store);
      }
      const [arg] = args;
      const isObjectKey = typeof arg === "function" || (typeof arg === "object" && arg !== null);
      const bucket = isObjectKey ? store.objects : store.primitives;
      const key: unknown = args.length === 0 ? EMPTY_ARGS : arg;
      if (bucket.has(key as never)) return bucket.get(key as never);
      const value = fn(...(args as never[]));
      bucket.set(key as never, value);
      return value;
    } as unknown as T;
  }

  return { ...actual, cache };
});

// ── Fakes do boundary externo (factories + glue de nomes) ───────────────────
const mockGetTopOpportunities = jest.fn();
const mockPresent = jest.fn();
const mockPresentSavings = jest.fn();
const mockGetStoreBySlug = jest.fn();

jest.mock("@/lib/buyer-intelligence-factory", () => ({
  createBuyerIntelligenceServices: () => ({
    opportunityEngine: { getTopOpportunities: mockGetTopOpportunities },
  }),
}));

jest.mock("@/lib/exchange-factory", () => ({
  createExchangeServices: () => ({
    presentationService: { present: mockPresent, presentSavings: mockPresentSavings },
  }),
}));

jest.mock("@/lib/realtime-commerce-factory", () => ({
  createRealtimeCommerceServices: () => ({
    marketPulseService: {
      getTopMovers: jest.fn(async () => []),
      computeForRange: jest.fn(async () => ({
        pricesChangedCount: 0,
        pricesDroppedCount: 0,
        pricesRaisedCount: 0,
        productsAddedCount: 0,
      })),
    },
    volatilityService: { computeForProduct: jest.fn() },
    changeRepo: { countInRange: jest.fn(async () => 0) },
  }),
}));

jest.mock("@/services/store.service", () => ({
  getStoreBySlug: mockGetStoreBySlug,
  // Mission 02B.2 — `getFeaturedStores` passou a usar a leitura em lote. Este
  // arquivo não exercita `getFeaturedStores`, mas o mock mantém o contrato do
  // módulo completo (e o teste de dedup da 02B.1 continua sendo a rede de
  // segurança daquela otimização).
  getStoresBySlugs: jest.fn(async () => new Map()),
}));

// `lib/home-premium-service` importa estes dois no topo. Não são exercitados
// pelos testes deste arquivo (só `getHomeStats` e `getFeaturedStores` os usam),
// mas o IMPORT executa — e marketplace-operations-factory → connectors-factory
// → crawlers → node-html-parser/entities é ESM puro, o que quebra o transform
// CJS do Jest. Mocká-los mantém o teste focado no boundary sendo provado.
jest.mock("@/lib/marketplace-operations-factory", () => ({
  createMarketplaceOperationsServices: () => ({
    metricsService: { snapshot: jest.fn(async () => ({ categories: 0 })) },
    priorityService: { listAll: jest.fn(async () => []) },
  }),
}));

jest.mock("@/lib/connector-directory-service", () => ({
  ConnectorDirectoryService: class {
    async listAll() {
      return [];
    }
  },
}));

type HomeService = typeof import("@/lib/home-premium-service");

let getFlashOffers: HomeService["getFlashOffers"];
let getBestSavingsToday: HomeService["getBestSavingsToday"];
let getMarketPulseHighlights: HomeService["getMarketPulseHighlights"];
let getLiveMarketplaceFeed: HomeService["getLiveMarketplaceFeed"];

beforeAll(async () => {
  const mod = await import("@/lib/home-premium-service");
  getFlashOffers = mod.getFlashOffers;
  getBestSavingsToday = mod.getBestSavingsToday;
  getMarketPulseHighlights = mod.getMarketPulseHighlights;
  getLiveMarketplaceFeed = mod.getLiveMarketplaceFeed;
});

interface Opportunity {
  canonicalProductId: string;
  productName: string;
  winningOfferProductId: string;
  cheapestStoreSlug: string;
  oldPriceUSD: number;
  newPriceUSD: number;
  savingsUSD: number;
  savingsPercent: number;
  isVerifiedStore: boolean;
}

function opportunity(id: string, savingsUSD: number): Opportunity {
  return {
    canonicalProductId: `canonical-${id}`,
    productName: `Produto ${id}`,
    winningOfferProductId: `product-${id}`,
    cheapestStoreSlug: `loja-${id}`,
    oldPriceUSD: 100,
    newPriceUSD: 100 - savingsUSD,
    savingsUSD,
    savingsPercent: savingsUSD,
    isVerifiedStore: true,
  };
}

/** Cliente falso: só o caminho `from("products").select("slug")…` (resolução
 * do slug do produto vencedor) é exercitado. Cada teste cria o SEU — o que
 * também isola a entrada do memo, cuja chave é o cliente. */
function makeClient() {
  const from = jest.fn(() => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: { slug: "slug-do-produto" } }),
      }),
    }),
  }));
  return { client: { from } as unknown as SupabaseClient, from };
}

/** Cliente falso cujo `from("stores").select("id").eq("active", true)` conta
 * quantas vezes a query de lojas públicas foi executada. */
function makeStoresClient(storeIds: string[]) {
  const from = jest.fn(() => ({
    select: () => ({
      eq: async () => ({ data: storeIds.map((id) => ({ id })) }),
    }),
  }));
  return { client: { from } as unknown as SupabaseClient, from };
}

beforeEach(() => {
  mockGetTopOpportunities.mockReset();
  mockPresent.mockReset();
  mockPresentSavings.mockReset();
  mockGetStoreBySlug.mockReset();

  mockPresent.mockResolvedValue({ amountUSD: 90, formattedUSD: "US$ 90.00" });
  mockPresentSavings.mockResolvedValue({
    amountUSD: 10,
    formattedUSD: "US$ 10.00",
    formattedPercent: "10%",
  });
  mockGetStoreBySlug.mockResolvedValue({ name: "Loja Real", active: true });
});

describe("Mission 02B.1 (P0-1) — OpportunityEngine executado UMA vez por render", () => {
  it("FlashOffers e Achado do Dia compartilham a MESMA execução cara", async () => {
    const { client } = makeClient();
    mockGetTopOpportunities.mockResolvedValue([
      opportunity("a", 30),
      opportunity("b", 20),
      opportunity("c", 10),
    ]);

    const flashOffers = await getFlashOffers(client);
    const bestSavings = await getBestSavingsToday(client);

    expect(mockGetTopOpportunities).toHaveBeenCalledTimes(1);
    expect(flashOffers).toHaveLength(3);
    expect(bestSavings).not.toBeNull();
  });

  it("usa FLASH_OFFERS_LIMIT (6) como limit da execução compartilhada", async () => {
    const { client } = makeClient();
    mockGetTopOpportunities.mockResolvedValue([opportunity("a", 30)]);

    await getFlashOffers(client);
    await getBestSavingsToday(client);

    expect(mockGetTopOpportunities).toHaveBeenCalledTimes(1);
    expect(mockGetTopOpportunities).toHaveBeenCalledWith(6);
  });

  it("bestSaving é o PRIMEIRO elemento da mesma lista de FlashOffers", async () => {
    const { client } = makeClient();
    mockGetTopOpportunities.mockResolvedValue([opportunity("a", 30), opportunity("b", 20)]);

    const flashOffers = await getFlashOffers(client);
    const bestSavings = await getBestSavingsToday(client);

    // `rankOpportunities` monta objetos de exibição novos a cada chamada, então
    // a identidade é por VALOR: o contrato é o mesmo item da mesma lista
    // ordenada (mesmo canonicalProductId, mesmo preço, mesma loja).
    expect(bestSavings).toEqual(flashOffers[0]);
    expect(bestSavings!.canonicalProductId).toBe(flashOffers[0].canonicalProductId);
    expect(bestSavings!.canonicalProductId).toBe("canonical-a");
    expect(bestSavings!.newPriceUSD).toBe(flashOffers[0].newPriceUSD);
    expect(bestSavings!.cheapestStoreName).toBe(flashOffers[0].cheapestStoreName);
  });

  it("ordem do engine é preservada, sem reordenação pelo consumidor", async () => {
    const { client } = makeClient();
    mockGetTopOpportunities.mockResolvedValue([
      opportunity("c", 30),
      opportunity("a", 20),
      opportunity("b", 10),
    ]);

    const flashOffers = await getFlashOffers(client);
    const bestSavings = await getBestSavingsToday(client);

    expect(flashOffers.map((o) => o.canonicalProductId)).toEqual([
      "canonical-c",
      "canonical-a",
      "canonical-b",
    ]);
    // Achado do Dia é o topo da MESMA ordenação — não um novo ranking.
    expect(bestSavings!.canonicalProductId).toBe("canonical-c");
  });

  it("lista vazia: FlashOffers = [] e Achado do Dia = null, ainda com UMA execução", async () => {
    const { client } = makeClient();
    mockGetTopOpportunities.mockResolvedValue([]);

    const flashOffers = await getFlashOffers(client);
    const bestSavings = await getBestSavingsToday(client);

    expect(flashOffers).toEqual([]);
    expect(bestSavings).toBeNull();
    expect(mockGetTopOpportunities).toHaveBeenCalledTimes(1);
  });

  it("respeita o teto de FlashOffers (6) sem alterar o Achado do Dia", async () => {
    const { client } = makeClient();
    mockGetTopOpportunities.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => opportunity(`p${i}`, 30 - i))
    );

    const flashOffers = await getFlashOffers(client);
    const bestSavings = await getBestSavingsToday(client);

    expect(flashOffers).toHaveLength(6);
    expect(bestSavings!.canonicalProductId).toBe("canonical-p0");
    expect(mockGetTopOpportunities).toHaveBeenCalledTimes(1);
  });
});

describe("Mission 02B.1 — cache() não altera resultados", () => {
  it("chamar duas vezes devolve o MESMO resultado e não re-executa o engine", async () => {
    const { client } = makeClient();
    mockGetTopOpportunities.mockResolvedValue([opportunity("a", 30), opportunity("b", 20)]);

    const first = await getFlashOffers(client);
    const second = await getFlashOffers(client);

    expect(second).toEqual(first);
    expect(mockGetTopOpportunities).toHaveBeenCalledTimes(1);
    // O memo cobre a leitura CARA (o pipeline do engine). O mapeamento de
    // exibição (`rankOpportunities`) continua rodando por chamada de consumidor
    // — 2 oportunidades × 2 chamadas = 4 apresentações — porque ele constrói
    // objetos novos para cada tela e não é o gargalo. O que esta missão
    // deduplica é a execução do engine, provada acima.
    expect(mockPresent).toHaveBeenCalledTimes(4);
  });

  it("clientes diferentes NÃO compartilham entrada (o boundary é a requisição)", async () => {
    const a = makeClient();
    const b = makeClient();
    mockGetTopOpportunities.mockResolvedValue([opportunity("a", 30)]);

    await getFlashOffers(a.client);
    await getFlashOffers(b.client);

    // Duas requisições distintas ⇒ duas execuções. O memo NÃO é persistente.
    expect(mockGetTopOpportunities).toHaveBeenCalledTimes(2);
  });
});

describe("Mission 02B.1 (P0-2) — getActiveStoreIds deduplicado no render", () => {
  it("Market Pulse e Live Marketplace compartilham a leitura de stores(active)", async () => {
    const { client, from } = makeStoresClient(["s1", "s2"]);

    await getMarketPulseHighlights(client);
    await getLiveMarketplaceFeed(client);

    // Antes: `stores.id WHERE active=true` era lida 2× só neste par (3× no
    // render completo, contando o Hero). Agora: 1×.
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("stores");
  });
});
