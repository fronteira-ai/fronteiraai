import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseCanonicalCatalogRepository } from "../infrastructure/SupabaseCanonicalCatalogRepository";

// Sprint 15 (egress) — `findByBrandId` deixou de ser um `select("*")` sem
// limite e passou a ser projeção explícita + paginação por `range` ordenada
// por `id`.
//
// O que só este teste cobre é o contrato da própria paginação: percorrer até
// o fim (uma marca maior que o `max_rows` do PostgREST era TRUNCADA EM
// SILÊNCIO antes), não duplicar nem perder linha entre páginas, pedir apenas
// as colunas que algum consumidor lê, e degradar para [] em erro exatamente
// como a consulta única que ele substitui.
//
// A prova de equivalência contra dados reais foi feita à parte, no banco
// local, comparando IDs e campos consumidos entre a consulta antiga e a nova
// para todas as marcas do catálogo, inclusive forçando múltiplas páginas.

const PAGE_SIZE = 500; // espelha BRAND_PAGE_SIZE (privado)

interface CanonicalRow {
  id: string;
  canonical_slug: string;
  name: string;
  brand_id: string | null;
  category_id: string | null;
  specifications: Record<string, string> | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  merged_into_id: string | null;
}

function makeRow(id: string, brandId = "brand-1"): CanonicalRow {
  return {
    id,
    canonical_slug: `slug-${id}`,
    name: `Produto ${id}`,
    brand_id: brandId,
    category_id: "cat-1",
    specifications: { cor: "preto" },
    created_at: "2026-08-09T00:00:00Z",
    updated_at: "2026-08-09T00:00:00Z",
    is_active: true,
    merged_into_id: null,
  };
}

/** `id` zero-padded para que a ordem lexicográfica case com a numérica —
 * o servidor ordena por `id`, e o mock devolve fatias já ordenadas. */
function makeRows(total: number): CanonicalRow[] {
  return Array.from({ length: total }, (_, i) => makeRow(`p-${String(i).padStart(5, "0")}`));
}

/** Cliente mínimo: `.from().select().eq().order().range()`. Cada chamada de
 * `range` devolve a fatia correspondente das linhas dadas, como o PostgREST
 * faria — nunca uma resposta pronta, para que um `offset` errado apareça
 * como linha perdida ou repetida em vez de passar despercebido. */
function makeClient(rows: CanonicalRow[], errorOnCall?: { call: number; message: string }) {
  const ranges: Array<[number, number]> = [];
  const orders: Array<[string, { ascending: boolean }]> = [];
  let call = 0;

  const range = jest.fn((from: number, to: number) => {
    call++;
    ranges.push([from, to]);
    if (errorOnCall && call === errorOnCall.call) {
      return Promise.resolve({ data: null, error: { message: errorOnCall.message } });
    }
    return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
  });
  const order = jest.fn((col: string, opts: { ascending: boolean }) => {
    orders.push([col, opts]);
    return { range };
  });
  const eq = jest.fn(() => ({ order }));
  let projection = "";
  const select = jest.fn((columns: string) => {
    projection = columns;
    return { eq };
  });
  const from = jest.fn(() => ({ select }));

  return {
    client: { from } as unknown as SupabaseClient,
    select,
    eq,
    order,
    range,
    ranges,
    orders,
    getProjection: () => projection,
  };
}

describe("SupabaseCanonicalCatalogRepository.findByBrandId", () => {
  it("marca pequena: uma única página, todos os campos consumidos mapeados", async () => {
    const { client, range } = makeClient(makeRows(3));
    const repo = new SupabaseCanonicalCatalogRepository(client);

    const result = await repo.findByBrandId("brand-1");

    expect(range).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      id: "p-00000",
      canonicalSlug: "slug-p-00000",
      name: "Produto p-00000",
      brandId: "brand-1",
      categoryId: "cat-1",
      specifications: { cor: "preto" },
      isActive: true,
      mergedIntoId: null,
    });
    // `image_url` saiu da projeção; `imageUrl: string | null` aceita null.
    expect(result[0].imageUrl).toBeNull();
    // Colunas mantidas deliberadamente na projeção — não podem virar undefined.
    expect(result[0].createdAt).toBe("2026-08-09T00:00:00Z");
    expect(result[0].updatedAt).toBe("2026-08-09T00:00:00Z");
  });

  it("atravessa várias páginas sem perder nem duplicar nenhum registro", async () => {
    const total = PAGE_SIZE * 2 + 137; // 1137 — duas páginas cheias e uma parcial
    const { client, range, ranges } = makeClient(makeRows(total));
    const repo = new SupabaseCanonicalCatalogRepository(client);

    const result = await repo.findByBrandId("brand-1");

    expect(range).toHaveBeenCalledTimes(3);
    expect(ranges).toEqual([
      [0, PAGE_SIZE - 1],
      [PAGE_SIZE, PAGE_SIZE * 2 - 1],
      [PAGE_SIZE * 2, PAGE_SIZE * 3 - 1],
    ]);

    expect(result).toHaveLength(total);
    const ids = result.map((r) => r.id);
    expect(new Set(ids).size).toBe(total); // zero duplicatas
    expect(ids[0]).toBe("p-00000");
    expect(ids[total - 1]).toBe(`p-${String(total - 1).padStart(5, "0")}`); // última página recuperada
    // Nenhum buraco: a sequência completa está presente.
    expect(ids).toEqual(makeRows(total).map((r) => r.id));
  });

  it("adversarial: total múltiplo exato do PAGE_SIZE lê a página final vazia em vez de parar cedo", async () => {
    const { client, range } = makeClient(makeRows(PAGE_SIZE));
    const repo = new SupabaseCanonicalCatalogRepository(client);

    const result = await repo.findByBrandId("brand-1");

    // Uma página cheia não prova que acabou — é preciso a página seguinte.
    expect(range).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(PAGE_SIZE);
    expect(new Set(result.map((r) => r.id)).size).toBe(PAGE_SIZE);
  });

  it("projeta apenas colunas consumidas: sem select(*), com specifications, sem image_url", async () => {
    const { client, getProjection } = makeClient(makeRows(1));
    const repo = new SupabaseCanonicalCatalogRepository(client);

    await repo.findByBrandId("brand-1");

    const projection = getProjection();
    expect(projection).not.toBe("*");
    expect(projection).not.toContain("image_url");
    // `specifications` alimenta buildProductSignature — remover quebraria o match.
    for (const col of ["id", "canonical_slug", "name", "brand_id", "category_id", "specifications", "created_at", "updated_at", "is_active", "merged_into_id"]) {
      expect(projection).toContain(col);
    }
  });

  it("ordena por id ascendente em toda página — paginar sem ordem determinística duplica ou perde linhas", async () => {
    const { client, orders } = makeClient(makeRows(PAGE_SIZE + 1));
    const repo = new SupabaseCanonicalCatalogRepository(client);

    await repo.findByBrandId("brand-1");

    expect(orders).toHaveLength(2);
    for (const [col, opts] of orders) {
      expect(col).toBe("id");
      expect(opts).toEqual({ ascending: true });
    }
  });

  it("marca sem produtos devolve []", async () => {
    const { client, range } = makeClient([]);
    const repo = new SupabaseCanonicalCatalogRepository(client);

    await expect(repo.findByBrandId("brand-vazia")).resolves.toEqual([]);
    expect(range).toHaveBeenCalledTimes(1);
  });

  it("erro na primeira página: loga e devolve [] (política de erro preservada)", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { client } = makeClient(makeRows(3), { call: 1, message: "boom" });
    const repo = new SupabaseCanonicalCatalogRepository(client);

    await expect(repo.findByBrandId("brand-1")).resolves.toEqual([]);
    expect(spy).toHaveBeenCalledWith("[SupabaseCanonicalCatalogRepository.findByBrandId]", "boom");
    spy.mockRestore();
  });

  it("erro numa página posterior devolve [] em vez de um resultado parcial silencioso", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { client, range } = makeClient(makeRows(PAGE_SIZE + 10), { call: 2, message: "falhou na pagina 2" });
    const repo = new SupabaseCanonicalCatalogRepository(client);

    // Devolver as 500 primeiras seria pior que devolver nada: o motor trataria
    // um conjunto truncado como se fosse a marca inteira.
    await expect(repo.findByBrandId("brand-1")).resolves.toEqual([]);
    expect(range).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
