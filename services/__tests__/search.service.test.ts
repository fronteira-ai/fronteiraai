// Sprint "Search Ordering + Out-of-Stock + SEO Recovery" (PR-001/PR-002).
//
// Regra canônica de ordenação da busca (seção produtos):
//   Grupo 1 — DISPONÍVEIS (inStock)  → price ASC
//   Grupo 2 — ESGOTADOS              → price ASC
// disponíveis sempre antes de esgotados; preço null por último (sem inventar).
//
// Estratégia: a ordenação GLOBAL é feita no SQL via RPC search_products_global
// (migration 20260827000000). Estes testes cobrem (1) o contrato que liga o
// serviço à RPC e que a ordem do banco sobrevive ao `.in()`; (2) o caminho de
// fallback quando a RPC ainda não está aplicada (self-hosted) — mesmo resultado
// determinístico sobre as linhas buscadas; (3) a matriz obrigatória e edge cases.
const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { searchEverything } from "../search.service";

// Cadeia encadeável e "thenable", como a do supabase-js.
function makeChain(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = { calls: [] as Array<[string, unknown[]]> };
  for (const method of ["select", "eq", "neq", "in", "ilike", "order", "range", "limit"]) {
    chain[method] = jest.fn((...args: unknown[]) => {
      (chain.calls as Array<[string, unknown[]]>).push([method, args]);
      return chain;
    });
  }
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

function productRow(id: string): Record<string, unknown> {
  return {
    id,
    name: `Produto ${id}`,
    slug: id,
    brand_id: "brand-a",
    category_id: "category-1",
    image_url: null,
    specifications: null,
    created_at: "2026-08-01T00:00:00Z",
    brand: null,
    category: null,
  };
}

function buildProduct(
  id: string,
  offers: Array<{ price_usd: number; in_stock: boolean }>
): Record<string, unknown> {
  return {
    ...productRow(id),
    offers,
  };
}

// Helper: configura o mock para o caminho RPC — chamada rpc devolve ids
// ordenados; from devolve as linhas completas (embaralhadas de propósito).
function arrangeRpcPath(rows: Array<Record<string, unknown>>, ranked: Array<{ product_id: string; has_stock: boolean; total_count: number }>) {
  mockRpc.mockResolvedValue({ data: ranked, error: null });
  mockFrom.mockImplementation((table: string) => {
    if (table === "stores") return makeChain({ data: [] });
    if (table === "brands") return makeChain({ data: [] });
    if (table === "categories") return makeChain({ data: [] });
    // products: devolve embaralhado para provar que o reorder pós-.in() vale
    if (table === "products") return makeChain({ data: rows });
    return makeChain({ data: [] });
  });
}

// Helper: RPC ausente → caminho de fallback (query direta com ilike+limit).
function arrangeFallbackPath(rows: Array<Record<string, unknown>>) {
  mockRpc.mockResolvedValue({ data: null, error: { message: "Could not find the function" } });
  mockFrom.mockImplementation((table: string) => {
    if (table === "stores") return makeChain({ data: [] });
    if (table === "brands") return makeChain({ data: [] });
    if (table === "categories") return makeChain({ data: [] });
    if (table === "products") return makeChain({ data: rows });
    return makeChain({ data: [] });
  });
}

describe("searchEverything — ordenação global por disponibilidade + preço (PR-001/PR-002)", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it("delega a ordenação dos produtos à RPC, repassando a consulta e o limite", async () => {
    arrangeRpcPath(
      [
        buildProduct("p1", [{ price_usd: 100, in_stock: true }]),
      ],
      [{ product_id: "p1", has_stock: true, total_count: 1 }]
    );
    await searchEverything("click");
    expect(mockRpc).toHaveBeenCalledWith("search_products_global", expect.objectContaining({ p_term: "click", p_limit: 8 }));
  });

  // ── MATRIZ OBRIGATÓRIA: AVAILABLE $100/$200/$300 → OUT_OF_STOCK $50/$150/$500
  it("ordena: disponíveis (de $100 a $300) antes e esgotados (de $50 a $500) depois", async () => {
    const rows = [
      buildProduct("oos500", [{ price_usd: 500, in_stock: false }]),
      buildProduct("av300", [{ price_usd: 300, in_stock: true }]),
      buildProduct("oos50", [{ price_usd: 50, in_stock: false }]),
      buildProduct("av100", [{ price_usd: 100, in_stock: true }]),
      buildProduct("av200", [{ price_usd: 200, in_stock: true }]),
      buildProduct("oos150", [{ price_usd: 150, in_stock: false }]),
    ];
    arrangeFallbackPath(rows);

    const result = await searchEverything("p");

    expect(result.products.map((p) => p.id)).toEqual(["av100", "av200", "av300", "oos50", "oos150", "oos500"]);
  });

  it("preserva a ordem global devolvida pela RPC mesmo com linhas embaralhadas no .in()", async () => {
    const rows = [
      buildProduct("av300", [{ price_usd: 300, in_stock: true }]),
      buildProduct("oos150", [{ price_usd: 150, in_stock: false }]),
      buildProduct("av100", [{ price_usd: 100, in_stock: true }]),
    ];
    const ranked = [
      { product_id: "av100", has_stock: true, total_count: 3 },
      { product_id: "av300", has_stock: true, total_count: 3 },
      { product_id: "oos150", has_stock: false, total_count: 3 },
    ];
    arrangeRpcPath(rows, ranked);

    const result = await searchEverything("p");

    expect(result.products.map((p) => p.id)).toEqual(["av100", "av300", "oos150"]);
  });

  // ── EDGE CASES
  it("coloca preço null no fim do seu grupo (sem inventar preço)", async () => {
    // sem oferta com preço → has_stock false, lowestPriceUSD null
    const rows = [
      buildProduct("oosNoPrice", []),
      buildProduct("av100", [{ price_usd: 100, in_stock: true }]),
    ];
    arrangeFallbackPath(rows);

    const result = await searchEverything("p");

    expect(result.products.map((p) => p.id)).toEqual(["av100", "oosNoPrice"]);
    expect(result.products[1].lowestPriceUSD).toBeNull();
  });

  it("avalia disponibilidade antes de preço: UM produto disponível $300 vêm antes de esgotados $50", async () => {
    const rows = [
      buildProduct("oos50", [{ price_usd: 50, in_stock: false }]),
      buildProduct("av300", [{ price_usd: 300, in_stock: true }]),
    ];
    arrangeFallbackPath(rows);

    const result = await searchEverything("p");

    expect(result.products.map((p) => p.id)).toEqual(["av300", "oos50"]);
  });

  it("produto com múltiplas ofertas usa o MENOR preço e disponível se qualquer oferta tiver estoque", async () => {
    const rows = [
      buildProduct("multi", [
        { price_usd: 90, in_stock: false },
        { price_usd: 120, in_stock: true },
      ]),
      buildProduct("av100", [{ price_usd: 100, in_stock: true }]),
    ];
    arrangeFallbackPath(rows);

    const result = await searchEverything("p");

    // multi tem oferta disponível (in_stock true) → grupo 1; menor preço 90 < 100
    expect(result.products.map((p) => p.id)).toEqual(["multi", "av100"]);
    const multi = result.products[0];
    expect(multi.lowestPriceUSD).toBe(90);
    expect(multi.inStock).toBe(true);
  });

  it("quando nada está disponível, ordena os esgotados por preço crescente", async () => {
    const rows = [
      buildProduct("oos500", [{ price_usd: 500, in_stock: false }]),
      buildProduct("oos50", [{ price_usd: 50, in_stock: false }]),
    ];
    arrangeFallbackPath(rows);

    const result = await searchEverything("p");

    expect(result.products.map((p) => p.id)).toEqual(["oos50", "oos500"]);
  });

  it("retorna vazio sem lançar para busca vazia", async () => {
    const result = await searchEverything("   ");
    expect(result.products).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("é determinístico sob empates de preço dentro do mesmo grupo (desempate por slug)", async () => {
    const rows = [
      { ...buildProduct("bprod", [{ price_usd: 100, in_stock: true }]) },
      { ...buildProduct("aprod", [{ price_usd: 100, in_stock: true }]) },
    ];
    arrangeFallbackPath(rows);

    const result = await searchEverything("p");

    expect(result.products.map((p) => p.id)).toEqual(["aprod", "bprod"]);
  });

  it("quando a RPC responde sem linhas, cai para o caminho legado (não devolve vazio indevidamente)", async () => {
    const rows = [buildProduct("av100", [{ price_usd: 100, in_stock: true }])];
    // RPC OK mas vazia → deve seguir para o fallback em vez de esvaziar.
    mockRpc.mockResolvedValue({ data: [], error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "stores") return makeChain({ data: [] });
      if (table === "brands") return makeChain({ data: [] });
      if (table === "categories") return makeChain({ data: [] });
      if (table === "products") return makeChain({ data: rows });
      return makeChain({ data: [] });
    });

    const result = await searchEverything("produto");

    expect(result.products.map((p) => p.id)).toEqual(["av100"]);
  });

  // GOLDEN QUERY SUITE (Search Recall V1): o serviço deve encaminhar o termo
  // (inclusive variante continuada) à RPC search_products_global, que é quem
  // aplica o recall (match com e sem espaços). Regressão: uma variante como
  // "iphone17pro" não pode ser quebrada/reescrita pelo serviço.
  it("repassa termos continuados (ex: iphone17pro) à RPC sem quebrar recall", async () => {
    const rows = [buildProduct("iphone17pro", [{ price_usd: 1200, in_stock: true }])];
    const ranked = [{ product_id: "iphone17pro", has_stock: true, total_count: 1 }];
    arrangeRpcPath(rows, ranked);
    await searchEverything("iphone17pro");
    expect(mockRpc).toHaveBeenCalledWith(
      "search_products_global",
      expect.objectContaining({ p_term: "iphone17pro", p_limit: 8 })
    );
  });

  it("repassa termo com espaços e maiúsculas à RPC (IPC: IPHONE 17 PRO)", async () => {
    const rows = [buildProduct("p1", [{ price_usd: 1200, in_stock: true }])];
    arrangeRpcPath(rows, [{ product_id: "p1", has_stock: true, total_count: 1 }]);
    await searchEverything("  IPHONE 17 PRO  ");
    // trim preservado; escapeLikePattern não altera letras/espaços
    expect(mockRpc).toHaveBeenCalledWith("search_products_global", expect.objectContaining({ p_term: "IPHONE 17 PRO" }));
  });
});
