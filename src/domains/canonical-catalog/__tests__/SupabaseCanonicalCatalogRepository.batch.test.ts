import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseCanonicalCatalogRepository } from "../infrastructure/SupabaseCanonicalCatalogRepository";

// Sprint 8B (P2-4) — `findOffersByCanonicalProductIds`, a leitura em lote que
// substituiu a consulta-por-candidato do OpportunityEngine.
//
// A prova de que o motor continua produzindo o mesmo resultado está em
// OpportunityEngine.test.ts (mesma suíte de sempre, agora exercitando o
// caminho em lote) e na comparação estrutural contra o banco local. O que só
// este teste cobre é o contrato do próprio lote: agrupar por
// canonical_product_id sem vazar oferta entre produtos, respeitar o teto por
// produto, e degradar para vazio em erro — exatamente como o método
// individual que ele substitui.

interface OfferRow {
  canonical_product_id: string;
  id: string;
  product_id: string;
  store_id: string;
  price_usd: number;
  in_stock: boolean;
  stock_quantity: number | null;
  updated_at: string;
  condition: string | null;
  warranty: string | null;
  product_url: string | null;
  stores: { slug: string } | null;
  available: boolean;
}

function makeRow(canonicalId: string, offerId: string, overrides: Partial<OfferRow> = {}): OfferRow {
  return {
    canonical_product_id: canonicalId,
    id: offerId,
    product_id: `product-${offerId}`,
    store_id: `store-${offerId}`,
    price_usd: 100,
    in_stock: true,
    stock_quantity: 3,
    updated_at: "2026-08-09T00:00:00Z",
    condition: "novo",
    warranty: "12 meses",
    product_url: "https://example.test/p",
    stores: { slug: `slug-${offerId}` },
    available: true,
    ...overrides,
  };
}

/** Cliente mínimo: `.from().select().in()` resolvendo para o resultado dado. */
function makeClient(result: { data?: OfferRow[]; error?: { message: string } }) {
  const inFn = jest.fn().mockResolvedValue(result);
  const select = jest.fn(() => ({ in: inFn }));
  const from = jest.fn(() => ({ select }));
  return { client: { from } as unknown as SupabaseClient, from, select, inFn };
}

describe("SupabaseCanonicalCatalogRepository.findOffersByCanonicalProductIds", () => {
  it("agrupa as ofertas por canonical_product_id sem vazar entre produtos", async () => {
    const { client } = makeClient({
      data: [
        makeRow("canon-a", "offer-1"),
        makeRow("canon-b", "offer-2"),
        makeRow("canon-a", "offer-3"),
      ],
    });
    const repo = new SupabaseCanonicalCatalogRepository(client);

    const result = await repo.findOffersByCanonicalProductIds(["canon-a", "canon-b"], 50);

    expect(result.get("canon-a")?.map((o) => o.offerId)).toEqual(["offer-1", "offer-3"]);
    expect(result.get("canon-b")?.map((o) => o.offerId)).toEqual(["offer-2"]);
  });

  it("mapeia todos os campos que o motor consome, inclusive o slug da loja", async () => {
    const { client } = makeClient({
      data: [makeRow("canon-a", "offer-1", { price_usd: 42, in_stock: false })],
    });
    const repo = new SupabaseCanonicalCatalogRepository(client);

    const [offer] = (await repo.findOffersByCanonicalProductIds(["canon-a"], 50)).get("canon-a")!;

    expect(offer).toMatchObject({
      offerId: "offer-1",
      productId: "product-offer-1",
      storeId: "store-offer-1",
      storeSlug: "slug-offer-1",
      priceUSD: 42,
      // `in_stock: false` continua sendo uma oferta válida — esgotada, não
      // arquivada (ADR-008). O lote não filtra nada que o individual não
      // filtrasse.
      inStock: false,
    });
  });

  it("candidato sem oferta simplesmente não aparece no Map (nunca entrada vazia fabricada)", async () => {
    const { client } = makeClient({ data: [makeRow("canon-a", "offer-1")] });
    const repo = new SupabaseCanonicalCatalogRepository(client);

    const result = await repo.findOffersByCanonicalProductIds(["canon-a", "canon-sem-oferta"], 50);

    expect(result.has("canon-a")).toBe(true);
    expect(result.has("canon-sem-oferta")).toBe(false);
  });

  it("respeita o teto por produto, como o `.range(0, limit-1)` que substitui", async () => {
    const { client } = makeClient({
      data: [
        makeRow("canon-a", "offer-1"),
        makeRow("canon-a", "offer-2"),
        makeRow("canon-a", "offer-3"),
        makeRow("canon-b", "offer-4"),
      ],
    });
    const repo = new SupabaseCanonicalCatalogRepository(client);

    const result = await repo.findOffersByCanonicalProductIds(["canon-a", "canon-b"], 2);

    expect(result.get("canon-a")).toHaveLength(2);
    expect(result.get("canon-b")).toHaveLength(1);
  });

  it("não consulta o banco quando a lista de ids está vazia", async () => {
    const { client, from } = makeClient({ data: [] });
    const repo = new SupabaseCanonicalCatalogRepository(client);

    const result = await repo.findOffersByCanonicalProductIds([], 50);

    expect(result.size).toBe(0);
    expect(from).not.toHaveBeenCalled();
  });

  it("deduplica ids repetidos numa única consulta", async () => {
    const { client, inFn } = makeClient({ data: [makeRow("canon-a", "offer-1")] });
    const repo = new SupabaseCanonicalCatalogRepository(client);

    await repo.findOffersByCanonicalProductIds(["canon-a", "canon-a", "canon-a"], 50);

    expect(inFn).toHaveBeenCalledTimes(1);
    expect(inFn).toHaveBeenCalledWith("canonical_product_id", ["canon-a"]);
  });

  it("degrada para vazio em erro, sem lançar — mesmo contrato do método individual", async () => {
    const { client } = makeClient({ error: { message: "boom" } });
    const repo = new SupabaseCanonicalCatalogRepository(client);
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await repo.findOffersByCanonicalProductIds(["canon-a"], 50);

    expect(result.size).toBe(0);
    spy.mockRestore();
  });
  // ── Sprint 9B (P3-1) ────────────────────────────────────────────────────
  it("mapeia available, e NÃO adiciona filtro global — o repositório é compartilhado", async () => {
    const { client, inFn, select } = makeClient({
      data: [
        makeRow("canon-a", "ativa", { available: true }),
        makeRow("canon-a", "arquivada", { available: false }),
      ],
    });
    const repo = new SupabaseCanonicalCatalogRepository(client);

    const offers = (await repo.findOffersByCanonicalProductIds(["canon-a"], 50)).get("canon-a")!;

    // Transporta as duas: market-insights e buyer-intelligence dependem do
    // conjunto completo. Quem decide o que é comparável é o
    // CompareFoundationService, não este repositório.
    expect(offers.map((o) => [o.offerId, o.available])).toEqual([
      ["ativa", true],
      ["arquivada", false],
    ]);
    // A coluna é selecionada...
    expect(select).toHaveBeenCalledWith(expect.stringContaining("available"));
    // ...mas o único filtro continua sendo o de canonical_product_id.
    expect(inFn).toHaveBeenCalledTimes(1);
    expect(inFn).toHaveBeenCalledWith("canonical_product_id", ["canon-a"]);
  });
});
