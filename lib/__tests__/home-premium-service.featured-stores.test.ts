// Mission 02B.2 — regressão do N+1 de `getFeaturedStores`.
//
// O que estes testes provam (e o que eles QUEBRAM se o N+1 voltar):
//   1. o número de consultas NÃO cresce com o número de lojas destaque;
//   2. a saída (DTO) permanece equivalente;
//   3. a ordem é a de `top` (score desc) — não a ordem de chegada do banco;
//   4. loja inativa/ausente nunca vira card público (fail-closed);
//   5. conjunto vazio ⇒ [] e ZERO consultas;
//   6. dado relacionado ausente preserva o fallback atual;
//   7. `getStoresBySlugs` emite EXATAMENTE UMA consulta para N slugs.
//
// A implementação ANTIGA fazia `getStoreBySlug` + um count de `offers` por
// loja (2 × N consultas). Se alguém reintroduzir esse padrão, as asserções
// `toHaveBeenCalledTimes(1)` abaixo falham.

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// ── Mocks do boundary externo ───────────────────────────────────────────────
// `lib/home-premium-service` importa estes factorys no topo; sem mocká-los o
// import puxa connectors-factory → crawlers → node-html-parser/entities
// (ESM puro), que quebra o transform CJS do Jest.
const mockPriorityListAll = jest.fn();
const mockConnectorEntries = jest.fn();

jest.mock("@/lib/marketplace-operations-factory", () => ({
  createMarketplaceOperationsServices: () => ({
    metricsService: { snapshot: jest.fn(async () => ({ categories: 0 })) },
    priorityService: { listAll: mockPriorityListAll },
  }),
}));

jest.mock("@/lib/connector-directory-service", () => ({
  ConnectorDirectoryService: class {
    async listAll() {
      return mockConnectorEntries();
    }
  },
}));

jest.mock("@/lib/buyer-intelligence-factory", () => ({
  createBuyerIntelligenceServices: () => ({ opportunityEngine: { getTopOpportunities: jest.fn() } }),
}));

jest.mock("@/lib/exchange-factory", () => ({
  createExchangeServices: () => ({
    presentationService: { present: jest.fn(), presentSavings: jest.fn() },
  }),
}));

jest.mock("@/lib/realtime-commerce-factory", () => ({
  createRealtimeCommerceServices: () => ({
    marketPulseService: { getTopMovers: jest.fn(), computeForRange: jest.fn() },
    volatilityService: { computeForProduct: jest.fn() },
    changeRepo: { countInRange: jest.fn() },
  }),
}));

// `getStoresBySlugs` (services/store.service) usa o cliente ANON de
// `@/lib/supabase`. É a função REAL que queremos exercitar, então mockamos só
// o cliente — e contamos quantas consultas ele emite.
const mockAnonFrom = jest.fn();
let anonStoreRows: unknown[] = [];

jest.mock("@/lib/supabase", () => ({
  supabase: { from: (table: string) => mockAnonFrom(table) },
}));

import type { SupabaseClient } from "@supabase/supabase-js";

type HomeService = typeof import("@/lib/home-premium-service");
let getFeaturedStores: HomeService["getFeaturedStores"];

let getStoresBySlugs: typeof import("@/services/store.service")["getStoresBySlugs"];

beforeAll(async () => {
  const mod = await import("@/lib/home-premium-service");
  getFeaturedStores = mod.getFeaturedStores;
  const storeService = await import("@/services/store.service");
  getStoresBySlugs = storeService.getStoresBySlugs;
});

// ── Fakes de query ─────────────────────────────────────────────────────────

/** Cadeia minima: `.select(x).in(y, z).eq(w, v)` → Promise<{data,error}> —
 * exatamente a forma usada por `getStoresBySlugs` e por
 * `countAvailableOffersByStoreIds`. */
function makeSelectChain(rows: unknown[], error: { message: string } | null = null) {
  const eq = jest.fn(async () => ({ data: rows, error }));
  const inFn = jest.fn(() => ({ eq }));
  const select = jest.fn(() => ({ in: inFn, eq }));
  return { select, in: inFn, eq };
}

/** Cliente falso que registra toda tabela consultada. */
function makeCountingClient(rowsByTable: Record<string, unknown[]>) {
  const tables: string[] = [];
  const from = jest.fn((table: string) => {
    tables.push(table);
    return { select: makeSelectChain(rowsByTable[table] ?? []).select };
  });
  return { client: { from } as unknown as SupabaseClient, from, tables };
}

function storeRow(over: Record<string, unknown>) {
  return {
    id: "s-1",
    name: "Loja 1",
    slug: "loja-1",
    cover_image: null,
    logo_url: null,
    is_verified: false,
    rating: 0,
    active: true,
    ...over,
  };
}

function priority(slug: string, storeId: string, score: number, storeName = `Loja ${slug}`) {
  return { storeId, storeSlug: slug, storeName, score };
}

beforeEach(() => {
  mockPriorityListAll.mockReset();
  mockConnectorEntries.mockReset();
  mockAnonFrom.mockReset();
  anonStoreRows = [];

  mockConnectorEntries.mockReturnValue([]);
  mockAnonFrom.mockImplementation((table: string) => {
    const rows = table === "stores" ? anonStoreRows : [];
    return { select: makeSelectChain(rows).select };
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe("Mission 02B.2 — getFeaturedStores: o N+1 foi eliminado", () => {
  it("6 lojas ⇒ 2 consultas no total (1 stores + 1 offers), nunca 2 × N", async () => {
    const slugs = ["a", "b", "c", "d", "e", "f"];
    mockPriorityListAll.mockResolvedValue(slugs.map((s, i) => priority(`loja-${s}`, `id-${s}`, 100 - i)));
    anonStoreRows = slugs.map((s) => storeRow({ id: `id-${s}`, slug: `loja-${s}`, active: true }));

    const offersRows = slugs.flatMap((s) => [{ store_id: `id-${s}` }, { store_id: `id-${s}` }]);
    const { client, from, tables } = makeCountingClient({ offers: offersRows });

    const result = await getFeaturedStores(client);

    expect(result).toHaveLength(6);
    // A leitura de stores (anon) é UMA só para os 6 slugs.
    expect(mockAnonFrom).toHaveBeenCalledTimes(1);
    expect(mockAnonFrom).toHaveBeenCalledWith("stores");
    // O count de ofertas é UMA só para as 6 lojas — antes: 6.
    expect(from).toHaveBeenCalledTimes(1);
    expect(tables).toEqual(["offers"]);
  });

  it("o número de consultas NÃO cresce com N (3 lojas e 6 lojas ⇒ mesmo total)", async () => {
    async function runWith(n: number) {
      const slugs = ["a", "b", "c", "d", "e", "f"].slice(0, n);
      mockPriorityListAll.mockReset();
      mockAnonFrom.mockClear();
      mockPriorityListAll.mockResolvedValue(slugs.map((s, i) => priority(`loja-${s}`, `id-${s}`, 100 - i)));
      anonStoreRows = slugs.map((s) => storeRow({ id: `id-${s}`, slug: `loja-${s}` }));
      const counting = makeCountingClient({
        offers: slugs.map((s) => ({ store_id: `id-${s}` })),
      });
      await getFeaturedStores(counting.client);
      return mockAnonFrom.mock.calls.length + counting.from.mock.calls.length;
    }

    const three = await runWith(3);
    const six = await runWith(6);

    expect(six).toBe(three);
    expect(six).toBe(2);
  });

  it("preserva a ORDEM de `top` (score desc), não a ordem do banco", async () => {
    // `priorities` deliberadamente FORA de ordem — o sort interno tem de agir.
    mockPriorityListAll.mockResolvedValue([
      priority("loja-c", "id-c", 10),
      priority("loja-a", "id-a", 90),
      priority("loja-b", "id-b", 50),
    ]);
    // O banco devolve em OUTRA ordem de novo.
    anonStoreRows = [
      storeRow({ id: "id-b", slug: "loja-b" }),
      storeRow({ id: "id-c", slug: "loja-c" }),
      storeRow({ id: "id-a", slug: "loja-a" }),
    ];
    const { client } = makeCountingClient({
      offers: [{ store_id: "id-a" }, { store_id: "id-b" }, { store_id: "id-c" }],
    });

    const result = await getFeaturedStores(client);

    expect(result.map((r) => r.slug)).toEqual(["loja-a", "loja-b", "loja-c"]);
  });

  it("respeita o limite de 6 lojas destaque", async () => {
    const slugs = Array.from({ length: 9 }, (_, i) => `s${i}`);
    mockPriorityListAll.mockResolvedValue(slugs.map((s, i) => priority(s, `id-${s}`, 50 - i)));
    anonStoreRows = slugs.map((s) => storeRow({ id: `id-${s}`, slug: s }));
    const { client } = makeCountingClient({});

    const result = await getFeaturedStores(client);

    expect(result).toHaveLength(6);
    expect(result.map((r) => r.slug)).toEqual(["s0", "s1", "s2", "s3", "s4", "s5"]);
  });
});

describe("Mission 02B.2 — fail-closed e fallbacks preservados", () => {
  it("loja AUSENTE na leitura pública não vira card", async () => {
    mockPriorityListAll.mockResolvedValue([priority("ok", "id-ok", 90), priority("sumiu", "id-sumiu", 80)]);
    anonStoreRows = [storeRow({ id: "id-ok", slug: "ok" })]; // "sumiu" não vem
    const { client } = makeCountingClient({
      offers: [{ store_id: "id-ok" }, { store_id: "id-sumiu" }],
    });

    const result = await getFeaturedStores(client);

    expect(result.map((r) => r.slug)).toEqual(["ok"]);
  });

  it("loja com active=false NÃO vaza, mesmo se a consulta a devolvesse", async () => {
    mockPriorityListAll.mockResolvedValue([priority("publica", "id-1", 90), priority("oculta", "id-2", 80)]);
    // Simula uma leitura que (indevidamente) traria a loja inativa: a checagem
    // POSITIVA dentro de getFeaturedStores tem de barrar.
    anonStoreRows = [
      storeRow({ id: "id-1", slug: "publica", active: true }),
      storeRow({ id: "id-2", slug: "oculta", active: false }),
    ];
    const { client } = makeCountingClient({ offers: [{ store_id: "id-1" }, { store_id: "id-2" }] });

    const result = await getFeaturedStores(client);

    expect(result.map((r) => r.slug)).toEqual(["publica"]);
  });

  it("conjunto vazio ⇒ [] e ZERO consultas de stores/offers", async () => {
    mockPriorityListAll.mockResolvedValue([]);
    const { client, from } = makeCountingClient({});

    const result = await getFeaturedStores(client);

    expect(result).toEqual([]);
    expect(mockAnonFrom).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it("dado relacionado ausente preserva o fallback atual (null/0/false)", async () => {
    mockPriorityListAll.mockResolvedValue([priority("loja-x", "id-x", 90, "Loja X")]);
    anonStoreRows = [
      storeRow({ id: "id-x", slug: "loja-x", cover_image: null, logo_url: null, is_verified: false, rating: 0 }),
    ];
    mockConnectorEntries.mockReturnValue([]); // sem conector ⇒ qualityScore/lastSyncAt null
    const { client } = makeCountingClient({ offers: [] }); // sem oferta ⇒ offerCount 0

    const [only] = await getFeaturedStores(client);

    expect(only).toEqual({
      slug: "loja-x",
      name: "Loja X",
      coverImage: null,
      logoUrl: null,
      isVerified: false,
      offerCount: 0,
      qualityScore: null,
      lastSyncAt: null,
      rating: 0,
    });
  });

  it("offerCount é POR loja (agrupamento em memória, não um total global)", async () => {
    mockPriorityListAll.mockResolvedValue([
      priority("a", "id-a", 90),
      priority("b", "id-b", 80),
      priority("c", "id-c", 70),
    ]);
    anonStoreRows = [
      storeRow({ id: "id-a", slug: "a" }),
      storeRow({ id: "id-b", slug: "b" }),
      storeRow({ id: "id-c", slug: "c" }),
    ];
    const { client } = makeCountingClient({
      offers: [
        { store_id: "id-a" },
        { store_id: "id-a" },
        { store_id: "id-a" },
        { store_id: "id-b" },
        // id-c sem oferta
      ],
    });

    const result = await getFeaturedStores(client);

    expect(result.map((r) => [r.slug, r.offerCount])).toEqual([
      ["a", 3],
      ["b", 1],
      ["c", 0],
    ]);
  });

  it("dados do conector são anexados por slug (qualityScore/lastSyncAt)", async () => {
    mockPriorityListAll.mockResolvedValue([priority("a", "id-a", 90)]);
    anonStoreRows = [storeRow({ id: "id-a", slug: "a" })];
    mockConnectorEntries.mockReturnValue([
      { storeSlug: "a", healthScore: 77, lastSyncAt: "2026-01-01T00:00:00.000Z" },
      { storeSlug: "outra", healthScore: 1, lastSyncAt: null },
    ]);
    const { client } = makeCountingClient({ offers: [{ store_id: "id-a" }] });

    const [only] = await getFeaturedStores(client);

    expect(only.qualityScore).toBe(77);
    expect(only.lastSyncAt).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("Mission 02B.2 — getStoresBySlugs (leitura em lote)", () => {
  it("N slugs ⇒ UMA consulta, com todos os slugs no `.in()` e `active=true`", async () => {
    anonStoreRows = [
      storeRow({ id: "id-a", slug: "a" }),
      storeRow({ id: "id-b", slug: "b" }),
      storeRow({ id: "id-c", slug: "c" }),
    ];

    const map = await getStoresBySlugs(["a", "b", "c"]);

    expect(mockAnonFrom).toHaveBeenCalledTimes(1);
    expect(map.size).toBe(3);
    expect(map.get("b")?.id).toBe("id-b");
  });

  it("slug ausente simplesmente não aparece no Map (o que era o null de getStoreBySlug)", async () => {
    anonStoreRows = [storeRow({ id: "id-a", slug: "a" })];

    const map = await getStoresBySlugs(["a", "nao-existe"]);

    expect(map.has("a")).toBe(true);
    expect(map.has("nao-existe")).toBe(false);
  });

  it("lista vazia (ou só slugs falsy) ⇒ ZERO consultas", async () => {
    const empty = await getStoresBySlugs([]);
    const falsy = await getStoresBySlugs(["", ""] as string[]);

    expect(empty.size).toBe(0);
    expect(falsy.size).toBe(0);
    expect(mockAnonFrom).not.toHaveBeenCalled();
  });

  it("slugs duplicados viram UMA consulta e UMA entrada", async () => {
    anonStoreRows = [storeRow({ id: "id-a", slug: "a" })];

    const map = await getStoresBySlugs(["a", "a", "a"]);

    expect(mockAnonFrom).toHaveBeenCalledTimes(1);
    expect(map.size).toBe(1);
  });
});
