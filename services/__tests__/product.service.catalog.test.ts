// Sprint 7B (P2-1) — contrato de integração entre getProductsCatalog e a RPC
// `search_products_catalog`.
//
// A correção em si (ordenação global) foi provada contra o PostgreSQL local:
// 46 preços em sequência, 0 violações de monotonicidade, nas duas direções e
// nas 13 combinações de filtro. Isso é cobertura de comportamento e não se
// repete aqui.
//
// O que só um teste unitário garante é o CONTRATO que liga as duas pontas —
// e que quebraria em silêncio numa refatoração futura: que o caminho de preço
// realmente delega ao banco em vez de reordenar em memória, que a ordem
// devolvida pelo banco sobrevive ao `.in()` (que não preserva ordem), e que o
// sort padrão continua sem tocar na RPC.
const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { getProductsCatalog } from "../product.service";

/** Cadeia encadeável e "thenable", como a do supabase-js. */
function makeChain(result: { data?: unknown; error?: unknown; count?: number }) {
  const chain: Record<string, unknown> = { calls: [] as Array<[string, unknown[]]> };
  for (const method of ["select", "eq", "neq", "in", "ilike", "gte", "lte", "order", "range", "limit"]) {
    chain[method] = jest.fn((...args: unknown[]) => {
      (chain.calls as Array<[string, unknown[]]>).push([method, args]);
      return chain;
    });
  }
  chain.maybeSingle = () => Promise.resolve({ data: null });
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

function productRow(id: string, offers: Array<{ price_usd: number; in_stock: boolean }>) {
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

describe("getProductsCatalog — ordenação global por preço (P2-1)", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it("delega a ordenação por preço à RPC, repassando todos os filtros", async () => {
    mockRpc.mockResolvedValue({ data: [{ product_id: "p1", lowest_price_usd: 10, total_count: 1 }] });
    mockFrom.mockImplementation(() => makeChain({ data: [productRow("p1", [{ price_usd: 10, in_stock: true }])] }));

    await getProductsCatalog({
      sort: "price_asc",
      onlyInStock: true,
      minPriceUSD: 100,
      maxPriceUSD: 900,
      page: 2,
      perPage: 12,
    });

    expect(mockRpc).toHaveBeenCalledWith(
      "search_products_catalog",
      expect.objectContaining({
        p_sort: "price_asc",
        p_only_in_stock: true,
        p_min_price: 100,
        p_max_price: 900,
        p_limit: 12,
        p_offset: 12, // página 2
      })
    );
  });

  it("preserva a ordem devolvida pela RPC mesmo quando o banco retorna as linhas embaralhadas", async () => {
    // A RPC ordenou p3 < p1 < p2. O `.in()` devolve em ordem arbitrária —
    // se o serviço confiasse nela, a ordenação global seria perdida no
    // último passo.
    mockRpc.mockResolvedValue({
      data: [
        { product_id: "p3", lowest_price_usd: 5, total_count: 3 },
        { product_id: "p1", lowest_price_usd: 10, total_count: 3 },
        { product_id: "p2", lowest_price_usd: 20, total_count: 3 },
      ],
    });
    mockFrom.mockImplementation(() =>
      makeChain({
        data: [
          productRow("p2", [{ price_usd: 20, in_stock: true }]),
          productRow("p3", [{ price_usd: 5, in_stock: true }]),
          productRow("p1", [{ price_usd: 10, in_stock: true }]),
        ],
      })
    );

    const result = await getProductsCatalog({ sort: "price_asc" });

    expect(result.products.map((p) => p.id)).toEqual(["p3", "p1", "p2"]);
    expect(result.products.map((p) => p.lowestPriceUSD)).toEqual([5, 10, 20]);
    expect(result.total).toBe(3);
  });

  it("aplica os mesmos filtros de oferta na consulta da página (available sempre; in_stock só quando pedido)", async () => {
    mockRpc.mockResolvedValue({ data: [{ product_id: "p1", lowest_price_usd: 10, total_count: 1 }] });
    const chain = makeChain({ data: [productRow("p1", [{ price_usd: 10, in_stock: false }])] });
    mockFrom.mockImplementation(() => chain);

    await getProductsCatalog({ sort: "price_asc" });

    const calls = chain.calls as Array<[string, unknown[]]>;
    // `available=true` é a definição de oferta ativa — vale sempre (ADR-008).
    expect(calls).toContainEqual(["eq", ["offers.available", true]]);
    // `in_stock` não foi pedido: oferta esgotada segue participando do preço.
    expect(calls.some(([m, a]) => m === "eq" && a[0] === "offers.in_stock")).toBe(false);
  });

  it("mantém o total quando a página pedida está além do fim", async () => {
    mockRpc
      .mockResolvedValueOnce({ data: [] }) // página vazia
      .mockResolvedValueOnce({ data: [{ product_id: "p1", lowest_price_usd: 10, total_count: 46 }] }); // sonda de total

    const result = await getProductsCatalog({ sort: "price_asc", page: 99 });

    expect(result.products).toEqual([]);
    expect(result.total).toBe(46);
    expect(result.totalPages).toBe(4); // 46 / 12
    expect(mockFrom).not.toHaveBeenCalled(); // nada a buscar
  });

  it("não usa a RPC no sort padrão — aquele caminho segue inalterado", async () => {
    mockFrom.mockImplementation(() =>
      makeChain({ data: [productRow("p1", [{ price_usd: 10, in_stock: true }])], count: 1 })
    );

    const result = await getProductsCatalog({ sort: "newest" });

    expect(mockRpc).not.toHaveBeenCalled();
    expect(result.products.map((p) => p.id)).toEqual(["p1"]);
  });

  it("devolve resultado vazio, sem quebrar, quando a RPC falha", async () => {
    mockRpc.mockResolvedValue({ error: new Error("boom") });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await getProductsCatalog({ sort: "price_desc" });

    expect(result).toEqual({ products: [], total: 0, page: 1, perPage: 12, totalPages: 0 });
    consoleSpy.mockRestore();
  });
});
