/**
 * Bootstrap Impact Report — Mission 04 (Offer Density), Prioridade 2.
 *
 * Read-only. Compares the current production state against the "before"
 * baseline captured earlier in this Mission (before the tokenizer fix +
 * canonical-catalog-bootstrap --execute ran) — hardcoded below since that
 * baseline was measured before this script existed. Run this once the
 * bootstrap background job finishes to get the real before/after numbers:
 *
 *   npx tsx scripts/bootstrap-impact-report.ts
 */

import { getServiceClient } from "./lib/client";

const PAGE_SIZE = 1000;

// Captured earlier in this Mission, before the ProductIdentityEngine
// tokenizer fix and before any canonical-catalog-bootstrap --execute run —
// the genuine pre-fix baseline, not re-derived here.
const BEFORE = {
  canonicalProductsTotal: null as number | null, // not captured pre-fix — first known total is the "after" run's own count minus this run's deltas; reported as "unknown" rather than guessed
  mergeCandidatesTotal: 4629,
  mergeCandidatesByStatus: { pending: 4585, approved: 14, merged: 27, rolled_back: 1, rejected: 2 },
  top100: { mean: 1.01, median: 1, pctOne: 99.0, pctTwoPlus: 1.0, pctFivePlus: 0.0 },
};

async function fetchAll<T>(supabase: ReturnType<typeof getServiceClient>, table: string, select: string): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function fetchFiltered<T>(
  supabase: ReturnType<typeof getServiceClient>,
  table: string,
  select: string,
  column: string,
  value: string
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select(select).eq(column, value).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

async function main() {
  const supabase = getServiceClient();

  const { count: canonicalCount } = await supabase.from("canonical_products").select("id", { count: "exact", head: true });

  const mc = await fetchAll<{ status: string }>(supabase, "merge_candidates", "status");
  const mcByStatus = new Map<string, number>();
  for (const r of mc) mcByStatus.set(r.status, (mcByStatus.get(r.status) ?? 0) + 1);

  const clickRows = await fetchFiltered<{ product_id: string | null }>(
    supabase,
    "buyer_events",
    "product_id",
    "event_type",
    "ProductClicked"
  );
  const countByProduct = new Map<string, number>();
  for (const row of clickRows) {
    if (!row.product_id) continue;
    countByProduct.set(row.product_id, (countByProduct.get(row.product_id) ?? 0) + 1);
  }
  const top100 = [...countByProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 100);
  const topIds = top100.map(([id]) => id);

  const canonicalByProduct = new Map<string, string>();
  const CHUNK = 200;
  for (let i = 0; i < topIds.length; i += CHUNK) {
    const chunk = topIds.slice(i, i + CHUNK);
    const { data, error } = await supabase.from("offers").select("product_id, canonical_product_id").in("product_id", chunk);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) if (row.canonical_product_id) canonicalByProduct.set(row.product_id, row.canonical_product_id);
  }

  const canonicalIds = [...new Set(canonicalByProduct.values())];
  const storesByCanonical = new Map<string, Set<string>>();
  for (let i = 0; i < canonicalIds.length; i += CHUNK) {
    const chunk = canonicalIds.slice(i, i + CHUNK);
    const { data, error } = await supabase.from("offers").select("canonical_product_id, store_id").in("canonical_product_id", chunk);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (!storesByCanonical.has(row.canonical_product_id)) storesByCanonical.set(row.canonical_product_id, new Set());
      storesByCanonical.get(row.canonical_product_id)!.add(row.store_id);
    }
  }

  const storeCounts = topIds
    .map((id) => {
      const cid = canonicalByProduct.get(id);
      return cid ? storesByCanonical.get(cid)?.size ?? 1 : 1;
    })
    .sort((a, b) => a - b);

  const mean = storeCounts.reduce((a, b) => a + b, 0) / storeCounts.length;
  const median = percentile(storeCounts, 50);
  const pctOne = (storeCounts.filter((c) => c === 1).length / storeCounts.length) * 100;
  const pctTwoPlus = (storeCounts.filter((c) => c >= 2).length / storeCounts.length) * 100;
  const pctFivePlus = (storeCounts.filter((c) => c >= 5).length / storeCounts.length) * 100;

  console.log("=== ANTES (capturado nesta Missão, antes do fix + bootstrap) ===");
  console.log(`Canonical products: ${BEFORE.canonicalProductsTotal ?? "não capturado (ver nota no script)"}`);
  console.log(`Merge candidates: ${BEFORE.mergeCandidatesTotal} — ${JSON.stringify(BEFORE.mergeCandidatesByStatus)}`);
  console.log(`Top 100 — média: ${BEFORE.top100.mean}, mediana: ${BEFORE.top100.median}, %1 loja: ${BEFORE.top100.pctOne}%, %2+: ${BEFORE.top100.pctTwoPlus}%, %5+: ${BEFORE.top100.pctFivePlus}%`);

  console.log("\n=== DEPOIS (agora) ===");
  console.log(`Canonical products: ${canonicalCount}`);
  console.log(`Merge candidates: ${mc.length} — ${JSON.stringify(Object.fromEntries(mcByStatus))}`);
  console.log(`Top 100 — média: ${mean.toFixed(2)}, mediana: ${median}, %1 loja: ${pctOne.toFixed(1)}%, %2+: ${pctTwoPlus.toFixed(1)}%, %5+: ${pctFivePlus.toFixed(1)}%`);
  console.log(`Distribuição: ${JSON.stringify(storeCounts)}`);

  const gainedCompetition = topIds.filter((id) => {
    const cid = canonicalByProduct.get(id);
    return cid && (storesByCanonical.get(cid)?.size ?? 1) >= 2;
  });
  console.log(`\nProdutos do Top 100 que ganharam 2+ lojas: ${gainedCompetition.length}`);
}
main();
