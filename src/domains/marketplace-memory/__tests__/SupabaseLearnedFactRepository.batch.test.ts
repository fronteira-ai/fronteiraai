import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseLearnedFactRepository } from "../infrastructure/SupabaseLearnedFactRepository";
import { FactType } from "../types/enums";

// Sprint 15B (egress) — `findByCanonicalProductIds`, a leitura em lote que
// substituiu a consulta-por-candidato do read-through do
// CanonicalMergeSuggestionService.
//
// O que só este teste cobre é o contrato do próprio lote: agrupar por
// canonical_product_id sem vazar fato entre produtos, atravessar chunks de
// IDs e páginas dentro de cada chunk sem perder nem duplicar, e degradar
// para vazio em erro — exatamente como o método individual que ele
// substitui, que continua existindo para quem lê um produto só.

const ID_CHUNK = 150;
const PAGE_SIZE = 500;

interface FactRow {
  id: string;
  canonical_product_id: string;
  fact_type: string;
  fact_value: string;
  confidence: string;
  source: string;
  extracted_from: string | null;
  merchant_id: string | null;
  origin: string;
  validation_status: string;
  algorithm_version: string;
  created_at: string;
  updated_at: string;
}

function makeRow(id: string, canonicalId: string, factType: FactType, factValue: string): FactRow {
  return {
    id,
    canonical_product_id: canonicalId,
    fact_type: factType,
    fact_value: factValue,
    confidence: "high",
    source: "specifications",
    extracted_from: "spec:cor",
    merchant_id: null,
    origin: "sync",
    validation_status: "unvalidated",
    algorithm_version: "1.0.0",
    created_at: "2026-08-09T00:00:00Z",
    updated_at: "2026-08-09T00:00:00Z",
  };
}

/** Cliente mínimo: `.from().select().in().order().range()`. O mock filtra
 * pelas linhas cujo canonical está no chunk e fatia por `range`, como o
 * PostgREST faria — um chunk ou offset errado aparece como fato perdido ou
 * duplicado, nunca como um teste que passa por coincidência. */
function makeClient(rows: FactRow[], errorOnCall?: number) {
  const chunksSeen: string[][] = [];
  const ranges: Array<[number, number]> = [];
  let call = 0;

  const range = jest.fn((from: number, to: number) => {
    call++;
    ranges.push([from, to]);
    if (errorOnCall === call) return Promise.resolve({ data: null, error: { message: "boom" } });
    const chunk = chunksSeen[chunksSeen.length - 1];
    const matching = rows.filter((r) => chunk.includes(r.canonical_product_id));
    return Promise.resolve({ data: matching.slice(from, to + 1), error: null });
  });
  const order = jest.fn(() => ({ range }));
  const inFn = jest.fn((_col: string, values: string[]) => {
    chunksSeen.push(values);
    return { order };
  });
  const select = jest.fn(() => ({ in: inFn }));
  const from = jest.fn(() => ({ select }));

  return { client: { from } as unknown as SupabaseClient, range, order, inFn, chunksSeen, ranges };
}

describe("SupabaseLearnedFactRepository.findByCanonicalProductIds", () => {
  it("agrupa os fatos por canonical sem vazar entre produtos", async () => {
    const rows = [
      makeRow("f1", "c-1", FactType.Model, "A315"),
      makeRow("f2", "c-2", FactType.Color, "preto"),
      makeRow("f3", "c-1", FactType.CapacityGb, "256"),
    ];
    const { client } = makeClient(rows);
    const repo = new SupabaseLearnedFactRepository(client);

    const result = await repo.findByCanonicalProductIds(["c-1", "c-2"]);

    expect(result.get("c-1")).toHaveLength(2);
    expect(result.get("c-2")).toHaveLength(1);
    expect(result.get("c-1")!.map((f) => f.factValue).sort()).toEqual(["256", "A315"]);
    expect(result.get("c-2")![0].factValue).toBe("preto");
    // Nenhum fato de c-2 pode ter caído em c-1.
    expect(result.get("c-1")!.every((f) => f.canonicalProductId === "c-1")).toBe(true);
  });

  it("ordem adversária das linhas não contamina o agrupamento", async () => {
    // Linhas intercaladas de propósito: c-3, c-1, c-2, c-1, c-3...
    const rows = [
      makeRow("f1", "c-3", FactType.Model, "m3"),
      makeRow("f2", "c-1", FactType.Model, "m1"),
      makeRow("f3", "c-2", FactType.Model, "m2"),
      makeRow("f4", "c-1", FactType.Color, "azul"),
      makeRow("f5", "c-3", FactType.RamGb, "16"),
      makeRow("f6", "c-1", FactType.CapacityGb, "512"),
    ];
    const { client } = makeClient(rows);
    const repo = new SupabaseLearnedFactRepository(client);

    const result = await repo.findByCanonicalProductIds(["c-1", "c-2", "c-3", "c-4"]);

    expect(result.get("c-1")!.map((f) => f.id)).toEqual(["f2", "f4", "f6"]);
    expect(result.get("c-2")!.map((f) => f.id)).toEqual(["f3"]);
    expect(result.get("c-3")!.map((f) => f.id)).toEqual(["f1", "f5"]);
    // c-4 não tem fato algum: ausente do Map, que o chamador lê como [].
    expect(result.has("c-4")).toBe(false);
    expect(result.get("c-4") ?? []).toEqual([]);
  });

  it("mapeia todos os campos do fato exatamente como o método individual", async () => {
    const { client } = makeClient([makeRow("f1", "c-1", FactType.ManufacturerCode, "A3257")]);
    const repo = new SupabaseLearnedFactRepository(client);

    const fact = (await repo.findByCanonicalProductIds(["c-1"])).get("c-1")![0];

    expect(fact).toEqual({
      id: "f1",
      canonicalProductId: "c-1",
      factType: FactType.ManufacturerCode,
      factValue: "A3257",
      confidence: "high",
      source: "specifications",
      extractedFrom: "spec:cor",
      merchantId: null,
      origin: "sync",
      validationStatus: "unvalidated",
      algorithmVersion: "1.0.0",
      createdAt: "2026-08-09T00:00:00Z",
      updatedAt: "2026-08-09T00:00:00Z",
    });
  });

  it("lista vazia não gera consulta alguma", async () => {
    const { client, range } = makeClient([]);
    const repo = new SupabaseLearnedFactRepository(client);

    await expect(repo.findByCanonicalProductIds([])).resolves.toEqual(new Map());
    expect(range).not.toHaveBeenCalled();
  });

  it("IDs duplicados são deduplicados antes da consulta", async () => {
    const { client, chunksSeen } = makeClient([makeRow("f1", "c-1", FactType.Model, "m1")]);
    const repo = new SupabaseLearnedFactRepository(client);

    const result = await repo.findByCanonicalProductIds(["c-1", "c-1", "c-1"]);

    expect(chunksSeen[0]).toEqual(["c-1"]); // uma vez só, não três
    expect(result.get("c-1")).toHaveLength(1); // e o fato não é duplicado
  });

  it("divide em chunks de 150 IDs sem perder nenhum", async () => {
    const ids = Array.from({ length: ID_CHUNK * 2 + 40 }, (_, i) => `c-${String(i).padStart(4, "0")}`);
    const rows = ids.map((id, i) => makeRow(`f-${i}`, id, FactType.Model, `m-${i}`));
    const { client, chunksSeen } = makeClient(rows);
    const repo = new SupabaseLearnedFactRepository(client);

    const result = await repo.findByCanonicalProductIds(ids);

    expect(chunksSeen.map((c) => c.length)).toEqual([ID_CHUNK, ID_CHUNK, 40]);
    expect(result.size).toBe(ids.length);
    for (const id of ids) expect(result.get(id)).toHaveLength(1);
  });

  it("pagina dentro do chunk: UNIQUE(canonical,fact_type) permite mais linhas que o max_rows", async () => {
    // Um único chunk cujo total de fatos ultrapassa PAGE_SIZE.
    const ids = Array.from({ length: 100 }, (_, i) => `c-${String(i).padStart(4, "0")}`);
    const rows = ids.flatMap((id, i) =>
      [FactType.Model, FactType.Color, FactType.CapacityGb, FactType.RamGb, FactType.Ean, FactType.Processor].map((t, j) =>
        makeRow(`f-${i}-${j}`, id, t, `v-${i}-${j}`)
      )
    );
    expect(rows.length).toBe(600); // > PAGE_SIZE

    const { client, ranges } = makeClient(rows);
    const repo = new SupabaseLearnedFactRepository(client);

    const result = await repo.findByCanonicalProductIds(ids);

    expect(ranges).toEqual([
      [0, PAGE_SIZE - 1],
      [PAGE_SIZE, PAGE_SIZE * 2 - 1],
    ]);
    expect(result.size).toBe(100);
    const total = [...result.values()].reduce((n, facts) => n + facts.length, 0);
    expect(total).toBe(600); // nenhum fato perdido na virada de página
    const allIds = [...result.values()].flat().map((f) => f.id);
    expect(new Set(allIds).size).toBe(600); // nenhum duplicado
  });

  it("erro devolve Map vazio — um parcial seria pior que nada", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const ids = Array.from({ length: ID_CHUNK + 10 }, (_, i) => `c-${i}`);
    const rows = ids.map((id, i) => makeRow(`f-${i}`, id, FactType.Model, `m-${i}`));
    // Falha no segundo chunk, depois de o primeiro já ter acumulado fatos.
    const { client } = makeClient(rows, 2);
    const repo = new SupabaseLearnedFactRepository(client);

    // Devolver o primeiro chunk faria o read-through tratar produtos COM
    // fatos como se não tivessem nenhum, disparando write-back indevido.
    await expect(repo.findByCanonicalProductIds(ids)).resolves.toEqual(new Map());
    expect(spy).toHaveBeenCalledWith("[SupabaseLearnedFactRepository.findByCanonicalProductIds]", "boom");
    spy.mockRestore();
  });

  it("ordena por id para que a paginação seja determinística", async () => {
    const { client, order } = makeClient([makeRow("f1", "c-1", FactType.Model, "m1")]);
    const repo = new SupabaseLearnedFactRepository(client);

    await repo.findByCanonicalProductIds(["c-1"]);

    expect(order).toHaveBeenCalledWith("id", { ascending: true });
  });
});
