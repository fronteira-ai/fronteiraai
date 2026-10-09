import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseCanonicalPriceHistoryRepository } from "../infrastructure/SupabaseCanonicalPriceHistoryRepository";

// Mission 05.6 — offers-first. The previous implementation asked price_history
// for an embedded `offers!inner(canonical_product_id)` and ordered by the parent
// table. PostgREST turns that into `INNER JOIN LATERAL ... ORDER BY
// price_history.recorded_at`; the planner cannot push the filter into the
// LATERAL, so production walked all 72,651 price_history rows and ran one
// lateral probe per row (72,651 Memoize, 52,683 misses) to return ONE canonical
// product's history: 651,4 ms / 207.233 buffers. These tests pin the two-step
// shape and its functional equivalence.

type Result = { data: unknown[] | null; error: { message: string } | null };
type Call = [string, unknown[]];

function makeChain(result: Result) {
  const chain: Record<string, unknown> = { calls: [] as Call[] };
  for (const method of ["select", "eq", "in", "order", "limit", "range"]) {
    chain[method] = (...args: unknown[]) => {
      (chain.calls as Call[]).push([method, args]);
      return chain;
    };
  }
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

function arrange(tables: Record<string, Result>) {
  const chains: Record<string, ReturnType<typeof makeChain>> = {};
  const every: Array<{ table: string; chain: ReturnType<typeof makeChain> }> = [];
  const client = {
    from: (table: string) => {
      const chain = makeChain(tables[table] ?? { data: [], error: null });
      chains[table] = chain;
      every.push({ table, chain });
      return chain;
    },
  };
  return {
    repo: new SupabaseCanonicalPriceHistoryRepository(client as unknown as SupabaseClient),
    chains,
    chainsFor: (table: string) => every.filter((e) => e.table === table).map((e) => e.chain),
  };
}

const callsOf = (chain: ReturnType<typeof makeChain>): Call[] => chain.calls as Call[];

describe("SupabaseCanonicalPriceHistoryRepository — offers-first (Mission 05.6)", () => {
  it("resolves the canonical product's offers first, then reads their history ordered by the DB", async () => {
    const { repo, chains } = arrange({
      offers: { data: [{ id: "o1" }, { id: "o2" }], error: null },
      price_history: {
        data: [
          { offer_id: "o1", price_usd: 10, recorded_at: "2026-01-01T00:00:00Z" },
          { offer_id: "o2", price_usd: 20, recorded_at: "2026-02-01T00:00:00Z" },
        ],
        error: null,
      },
    });

    const points = await repo.findByCanonicalProductId("cp-1");

    // Step 1 — the same filter, now on the offers side.
    expect(callsOf(chains.offers)).toContainEqual(["eq", ["canonical_product_id", "cp-1"]]);

    // Step 2 — no embed anywhere, and the same ordering/scope as before.
    const historySelect = String(callsOf(chains.price_history).find(([m]) => m === "select")?.[1][0]);
    expect(historySelect).not.toContain("offers!inner");
    expect(callsOf(chains.price_history)).toContainEqual(["in", ["offer_id", ["o1", "o2"]]]);
    expect(callsOf(chains.price_history)).toContainEqual(["order", ["recorded_at", { ascending: true }]]);

    // Mapping/equivalence of the returned points.
    expect(points).toEqual([
      { offerId: "o1", priceUSD: 10, recordedAt: "2026-01-01T00:00:00Z" },
      { offerId: "o2", priceUSD: 20, recordedAt: "2026-02-01T00:00:00Z" },
    ]);
  });

  it("missing data: a canonical product without offers returns [] and never touches price_history", async () => {
    const { repo, chainsFor } = arrange({ offers: { data: [], error: null } });

    expect(await repo.findByCanonicalProductId("cp-orphan")).toEqual([]);
    expect(chainsFor("price_history")).toHaveLength(0); // no ordered walk at all
  });

  it("missing data: an offers row with no history returns [] (same as the old INNER join)", async () => {
    const { repo } = arrange({
      offers: { data: [{ id: "o1" }], error: null },
      price_history: { data: [], error: null },
    });

    expect(await repo.findByCanonicalProductId("cp-1")).toEqual([]);
  });

  it("query error on the offers step degrades to [] (never throws)", async () => {
    const { repo } = arrange({ offers: { data: null, error: { message: "boom" } } });

    expect(await repo.findByCanonicalProductId("cp-1")).toEqual([]);
  });

  it("query error on the history step degrades to [] (never throws)", async () => {
    const { repo } = arrange({
      offers: { data: [{ id: "o1" }], error: null },
      price_history: { data: null, error: { message: "boom" } },
    });

    expect(await repo.findByCanonicalProductId("cp-1")).toEqual([]);
  });

  it("equivalence: same rows, same order, same projection as the embedded shape", async () => {
    // The embedded shape returned exactly the price_history rows whose offer
    // belongs to the canonical product, in recorded_at ASC order. The two-step
    // shape must produce the identical projection for the same underlying data.
    const rows = [
      { offer_id: "o2", price_usd: 5, recorded_at: "2026-03-01T00:00:00Z" },
      { offer_id: "o1", price_usd: 7, recorded_at: "2026-03-02T00:00:00Z" },
      { offer_id: "o1", price_usd: null, recorded_at: "2026-03-03T00:00:00Z" },
    ];
    const { repo } = arrange({
      offers: { data: [{ id: "o1" }, { id: "o2" }], error: null },
      price_history: { data: rows, error: null },
    });

    const points = await repo.findByCanonicalProductId("cp-1");

    expect(points.map((p) => p.offerId)).toEqual(["o2", "o1", "o1"]);
    expect(points.map((p) => p.priceUSD)).toEqual([5, 7, null]); // nulls preserved, not coerced
    expect(points.map((p) => p.recordedAt)).toEqual([
      "2026-03-01T00:00:00Z",
      "2026-03-02T00:00:00Z",
      "2026-03-03T00:00:00Z",
    ]);
  });
});
