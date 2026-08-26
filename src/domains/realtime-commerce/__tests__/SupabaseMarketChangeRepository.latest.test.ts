import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseMarketChangeRepository } from "../infrastructure/SupabaseMarketChangeRepository";
import { MarketChangeEntityType } from "../enums";

/**
 * Sprint 13B — `detected_at` não é chave única. Medido no banco local: 5 das
 * 120 ofertas com histórico têm duas mudanças gravadas no mesmo
 * milissegundo. Sem segundo critério de ordenação, qual das duas o Postgres
 * devolve fica a cargo do plano de execução — e `latestForEntity` e
 * `latestForEntities` chegaram a escolher linhas diferentes para a mesma
 * oferta.
 *
 * O cliente falso abaixo é um PostgREST em miniatura: aplica de verdade os
 * `.eq`/`.in`/`.order`/`.limit` que o repositório declara, sobre linhas
 * guardadas em ordem CRESCENTE de id. Assim, se alguém remover o
 * `.order("id", { ascending: false })` de qualquer um dos dois métodos, o
 * empate volta a ser resolvido pelo id MENOR e os testes falham — em vez de
 * passarem por acaso, como passariam contra um mock que só devolve uma lista
 * pronta.
 */
interface Row {
  id: string;
  change_type: string;
  entity_type: string;
  entity_id: string;
  product_id: string | null;
  store_id: string | null;
  field: string;
  previous_value: string | null;
  current_value: string | null;
  confidence: number;
  source: string;
  detected_at: string;
}

function makeRow(entityId: string, id: string, detectedAt: string, entityType = "offer"): Row {
  return {
    id,
    change_type: "price_decreased",
    entity_type: entityType,
    entity_id: entityId,
    product_id: null,
    store_id: null,
    field: "price_usd",
    previous_value: "100",
    current_value: "90",
    confidence: 1,
    source: "seed",
    detected_at: detectedAt,
  };
}

type Filter = (row: Row) => boolean;
type Sort = { column: keyof Row; ascending: boolean };

/** Sprint 13C: o mesmo teto que `supabase/config.toml` declara. O PostgREST
 * corta QUALQUER resposta neste tamanho, em silêncio — é exatamente esse
 * comportamento que o cliente falso reproduz. */
const MAX_ROWS = 1000;

/**
 * PostgREST mínimo: filtra (`eq`/`in`), ordena por TODAS as chaves declaradas
 * na ordem em que foram declaradas, recorta por `limit`/`range` e — o ponto da
 * Sprint 13C — aplica `MAX_ROWS` a toda resposta, inclusive quando nenhum
 * recorte foi pedido. Nada aqui conhece a regra de desempate nem a de
 * paginação: as duas precisam vir das chamadas que o repositório faz.
 */
function makeClient(rows: Row[]) {
  // Ordem de armazenamento adversária: id crescente. O empate só sai certo se
  // o repositório pedir `id` decrescente explicitamente.
  const stored = [...rows].sort((a, b) => (a.id < b.id ? -1 : 1));
  const pedidos: { from: number; to: number | null }[] = [];

  function builder(filters: Filter[], sorts: Sort[]) {
    const run = () => {
      const filtered = stored.filter((r) => filters.every((f) => f(r)));
      return filtered.sort((a, b) => {
        for (const { column, ascending } of sorts) {
          if (a[column] === b[column]) continue;
          const cmp = (a[column] as string) < (b[column] as string) ? -1 : 1;
          return ascending ? cmp : -cmp;
        }
        return 0;
      });
    };

    /** Toda resposta passa por aqui: o teto do PostgREST não é opcional. */
    const respond = (slice: Row[]) => ({ data: slice.slice(0, MAX_ROWS), error: null });

    const api = {
      eq: (column: keyof Row, value: string) => builder([...filters, (r) => r[column] === value], sorts),
      in: (column: keyof Row, values: string[]) => builder([...filters, (r) => values.includes(r[column] as string)], sorts),
      order: (column: keyof Row, opts?: { ascending?: boolean }) =>
        builder(filters, [...sorts, { column, ascending: opts?.ascending !== false }]),
      limit: (n: number) => {
        pedidos.push({ from: 0, to: n - 1 });
        const sliced = run().slice(0, n);
        return {
          maybeSingle: async () => ({ data: respond(sliced).data[0] ?? null, error: null }),
          then: (resolve: (v: { data: Row[]; error: null }) => unknown) => resolve(respond(sliced)),
        };
      },
      range: (fromIndex: number, toIndex: number) => {
        pedidos.push({ from: fromIndex, to: toIndex });
        return {
          then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
            resolve(respond(run().slice(fromIndex, toIndex + 1))),
        };
      },
      then: (resolve: (v: { data: Row[]; error: null }) => unknown) => {
        pedidos.push({ from: 0, to: null });
        return resolve(respond(run()));
      },
    };
    return api;
  }

  const select = jest.fn(() => builder([], []));
  const from = jest.fn(() => ({ select }));
  return { client: { from } as unknown as SupabaseClient, from, pedidos };
}

/** Açúcar: a maioria dos testes só quer o cliente. */
function client(rows: Row[]): SupabaseClient {
  return makeClient(rows).client;
}

const T = "2026-08-07T22:18:20.427+00:00";

describe("SupabaseMarketChangeRepository — desempate de detected_at (Sprint 13B)", () => {
  const empatadas = [
    makeRow("offer-x", "aaaa-menor", T),
    makeRow("offer-x", "zzzz-maior", T),
  ];

  it("latestForEntity: em empate de detected_at, vence o maior id", async () => {
    const repo = new SupabaseMarketChangeRepository(client(empatadas));

    const latest = await repo.latestForEntity(MarketChangeEntityType.Offer, "offer-x");

    expect(latest?.id).toBe("zzzz-maior");
  });

  it("latestForEntities: em empate de detected_at, vence o maior id", async () => {
    const repo = new SupabaseMarketChangeRepository(client(empatadas));

    const latest = await repo.latestForEntities(MarketChangeEntityType.Offer, ["offer-x"]);

    expect(latest.get("offer-x")?.id).toBe("zzzz-maior");
  });

  it("os dois métodos devolvem a MESMA linha, campo a campo", async () => {
    const rows = [
      ...empatadas,
      // desempate não pode atropelar o critério principal: id maior, mas anterior
      makeRow("offer-x", "zzzz-mais-velho", "2026-08-01T00:00:00+00:00"),
      // outra oferta, também empatada
      makeRow("offer-y", "bbbb-menor", T),
      makeRow("offer-y", "cccc-maior", T),
      // mesma id de entidade, outro entity_type: não pode vazar
      makeRow("offer-x", "dddd-produto", "2026-08-09T00:00:00+00:00", "product"),
    ];
    const repo = new SupabaseMarketChangeRepository(client(rows));
    const ids = ["offer-x", "offer-y", "offer-sem-mudanca"];

    const batch = await repo.latestForEntities(MarketChangeEntityType.Offer, ids);
    for (const id of ids) {
      const individual = await repo.latestForEntity(MarketChangeEntityType.Offer, id);
      expect(batch.get(id) ?? null).toEqual(individual);
    }

    expect(batch.get("offer-x")?.id).toBe("zzzz-maior");
    expect(batch.get("offer-y")?.id).toBe("cccc-maior");
    expect(batch.has("offer-sem-mudanca")).toBe(false);
  });

  it("o desempate só entra quando há empate: detected_at maior sempre vence", async () => {
    const rows = [
      makeRow("offer-z", "zzzz-antigo", "2026-08-01T00:00:00+00:00"),
      makeRow("offer-z", "aaaa-recente", "2026-08-09T00:00:00+00:00"),
    ];
    const repo = new SupabaseMarketChangeRepository(client(rows));

    expect((await repo.latestForEntity(MarketChangeEntityType.Offer, "offer-z"))?.id).toBe("aaaa-recente");
    expect((await repo.latestForEntities(MarketChangeEntityType.Offer, ["offer-z"])).get("offer-z")?.id).toBe(
      "aaaa-recente"
    );
  });
});

/**
 * Sprint 13C — `market_changes` é append-only: o histórico por entidade só
 * cresce. Uma leitura em lote sem paginação acaba ultrapassando o `max_rows`
 * do PostgREST, que corta a resposta SEM erro — e as entidades que caíssem no
 * fim da ordenação sumiriam do Map, degradando silenciosamente para o
 * `fallbackUpdatedAt` do chamador.
 *
 * O conjunto abaixo é montado justamente para que isso doesse: 60 entidades ×
 * 30 mudanças = 1.800 linhas, com os `detected_at` escalonados de forma que
 * TODAS as 30 linhas da entidade 0 venham antes das da entidade 1, e assim por
 * diante. Sem paginação, a resposta pararia na linha 1.000 e as entidades 34 a
 * 59 nunca seriam vistas — nenhuma delas tem uma única linha nas 1.000
 * primeiras.
 */
const TOTAL_ENTIDADES = 60;
const MUDANCAS_POR_ENTIDADE = 30;

function makeDatasetGrande(): { rows: Row[]; ids: string[] } {
  const rows: Row[] = [];
  const ids: string[] = [];
  const base = Date.UTC(2026, 7, 10, 0, 0, 0);

  for (let e = 0; e < TOTAL_ENTIDADES; e++) {
    const entityId = `offer-${String(e).padStart(3, "0")}`;
    ids.push(entityId);
    for (let m = 0; m < MUDANCAS_POR_ENTIDADE; m++) {
      // entidade 0 é a mais recente de todas; dentro dela, m=0 é a mais nova.
      const detectedAt = new Date(base - e * 86_400_000 - m * 3_600_000).toISOString();
      rows.push(makeRow(entityId, `change-${String(e).padStart(3, "0")}-${String(m).padStart(3, "0")}`, detectedAt));
    }
  }
  return { rows, ids };
}

describe("SupabaseMarketChangeRepository.latestForEntities — max_rows e paginação (Sprint 13C)", () => {
  it("não perde nenhuma entidade quando o conjunto do chunk ultrapassa max_rows", async () => {
    const { rows, ids } = makeDatasetGrande();
    expect(rows.length).toBeGreaterThan(MAX_ROWS); // 1.800 > 1.000: a truncagem é real
    const repo = new SupabaseMarketChangeRepository(client(rows));

    const latest = await repo.latestForEntities(MarketChangeEntityType.Offer, ids);

    expect(latest.size).toBe(TOTAL_ENTIDADES);
    for (const id of ids) expect(latest.has(id)).toBe(true);
  });

  it("escolhe a mudança mais recente de cada entidade, inclusive das que só aparecem depois da linha 1.000", async () => {
    const { rows, ids } = makeDatasetGrande();
    const repo = new SupabaseMarketChangeRepository(client(rows));

    const latest = await repo.latestForEntities(MarketChangeEntityType.Offer, ids);

    // m=0 é a mais nova de cada entidade — inclusive para a última, cuja
    // primeira linha está no índice 59 x 30 = 1.770 da ordenação global.
    for (let e = 0; e < TOTAL_ENTIDADES; e++) {
      expect(latest.get(ids[e])?.id).toBe(`change-${String(e).padStart(3, "0")}-000`);
    }
  });

  it("continua idêntico ao método individual para 1, 2, 10 e todas as entidades", async () => {
    const { rows, ids } = makeDatasetGrande();
    const repo = new SupabaseMarketChangeRepository(client(rows));
    const campos = [
      "id", "changeType", "entityType", "entityId", "productId", "storeId",
      "field", "previousValue", "currentValue", "confidence", "source", "detectedAt",
    ] as const;

    for (const n of [1, 2, 10, ids.length]) {
      const subset = ids.slice(0, n);
      const batch = await repo.latestForEntities(MarketChangeEntityType.Offer, subset);
      for (const id of subset) {
        const individual = await repo.latestForEntity(MarketChangeEntityType.Offer, id);
        const emLote = batch.get(id) ?? null;
        expect(emLote).toEqual(individual);
        for (const campo of campos) {
          expect(emLote?.[campo]).toEqual(individual?.[campo]);
        }
      }
    }
  });

  it("lê páginas sucessivas, sem sobreposição e sem buraco entre elas", async () => {
    const { rows, ids } = makeDatasetGrande();
    const { client: fake, pedidos } = makeClient(rows);
    const repo = new SupabaseMarketChangeRepository(fake);

    await repo.latestForEntities(MarketChangeEntityType.Offer, ids);

    expect(pedidos.length).toBeGreaterThan(1); // uma página só não daria conta
    for (let i = 0; i < pedidos.length; i++) {
      const tamanho = pedidos[i].to! - pedidos[i].from + 1;
      expect(tamanho).toBeLessThanOrEqual(MAX_ROWS); // nunca pede além do teto
      // páginas encostadas: o início de uma é o fim da anterior + 1
      if (i > 0) expect(pedidos[i].from).toBe(pedidos[i - 1].to! + 1);
    }
  });

  it("não volta ao N+1: o número de consultas depende do volume, não da quantidade de entidades", async () => {
    const { rows, ids } = makeDatasetGrande();
    const { client: fake, from } = makeClient(rows);
    const repo = new SupabaseMarketChangeRepository(fake);

    await repo.latestForEntities(MarketChangeEntityType.Offer, ids);

    // 1.800 linhas em páginas de 500 = no máximo 4 leituras, para 60 entidades.
    expect(from.mock.calls.length).toBeLessThanOrEqual(4);
    expect(from.mock.calls.length).toBeLessThan(ids.length);
  });

  it("para assim que todas as entidades foram resolvidas, sem varrer o histórico inteiro", async () => {
    const { rows } = makeDatasetGrande();
    const { client: fake, from } = makeClient(rows);
    const repo = new SupabaseMarketChangeRepository(fake);

    // as 3 primeiras entidades têm suas linhas mais novas logo no começo da
    // ordenação: uma página basta, mesmo havendo 1.800 linhas na tabela.
    await repo.latestForEntities(MarketChangeEntityType.Offer, ["offer-000", "offer-001", "offer-002"]);

    expect(from.mock.calls.length).toBe(1);
  });

  it("lista vazia: nenhum acesso ao banco e Map vazio", async () => {
    const { client: fake, from } = makeClient(makeDatasetGrande().rows);
    const repo = new SupabaseMarketChangeRepository(fake);

    const latest = await repo.latestForEntities(MarketChangeEntityType.Offer, []);

    expect(latest.size).toBe(0);
    expect(from).not.toHaveBeenCalled();
  });
});
