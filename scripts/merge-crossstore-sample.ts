/**
 * One-off, read-only: checks whether ANY pending merge_candidate is
 * cross-store — Sprint 2.7 already proved via an 11.28M-pair simulation
 * that zero cross-merchant pairs clear even the lowest confidence
 * threshold; this checks whether that holds at execution time against the
 * real, already-generated 3.106 candidates. Batched (not N+1) — fetches
 * every relevant offer's (canonical_product_id, store_id) once and groups
 * in memory, instead of 2 round trips per candidate.
 *
 * Uso: npx tsx scripts/merge-crossstore-sample.ts
 */
import { getServiceClient } from "./lib/client";

const PAGE_SIZE = 1000;

async function fetchAllOffers(supabase: ReturnType<typeof getServiceClient>) {
  const rows: { canonical_product_id: string | null; store_id: string }[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from("offers").select("canonical_product_id, store_id").range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`offers query failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function fetchAllPendingCandidates(supabase: ReturnType<typeof getServiceClient>) {
  const rows: { id: string; source_canonical_product_id: string; target_canonical_product_id: string; confidence: number }[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("merge_candidates")
      .select("id, source_canonical_product_id, target_canonical_product_id, confidence")
      .eq("status", "pending")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`merge_candidates query failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function main() {
  const supabase = getServiceClient();

  const [offers, candidates] = await Promise.all([fetchAllOffers(supabase), fetchAllPendingCandidates(supabase)]);

  const storesByCanonical = new Map<string, Set<string>>();
  for (const o of offers) {
    if (!o.canonical_product_id) continue;
    if (!storesByCanonical.has(o.canonical_product_id)) storesByCanonical.set(o.canonical_product_id, new Set());
    storesByCanonical.get(o.canonical_product_id)!.add(o.store_id);
  }

  console.log(`Checking store composition for all ${candidates.length} pending candidates (batched)...\n`);

  let intraStore = 0;
  let crossStore = 0;
  let missingLink = 0;
  const crossStoreSamples: string[] = [];

  for (const c of candidates) {
    const sourceStores = storesByCanonical.get(c.source_canonical_product_id) ?? new Set<string>();
    const targetStores = storesByCanonical.get(c.target_canonical_product_id) ?? new Set<string>();
    if (sourceStores.size === 0 || targetStores.size === 0) {
      missingLink++;
      continue;
    }
    const sameStores = sourceStores.size === targetStores.size && [...sourceStores].every((s) => targetStores.has(s));
    if (sameStores) intraStore++;
    else {
      crossStore++;
      if (crossStoreSamples.length < 15) {
        crossStoreSamples.push(
          `${c.id.slice(0, 8)} | conf ${c.confidence} | source: [${[...sourceStores].join(",")}] | target: [${[...targetStores].join(",")}]`
        );
      }
    }
  }

  console.log(`Intra-store:    ${intraStore} (${((intraStore / candidates.length) * 100).toFixed(1)}%)`);
  console.log(`Cross-store:    ${crossStore} (${((crossStore / candidates.length) * 100).toFixed(1)}%)`);
  console.log(`No offer link:  ${missingLink} (${((missingLink / candidates.length) * 100).toFixed(1)}%)`);
  if (crossStoreSamples.length > 0) {
    console.log("\n— Cross-store samples —");
    crossStoreSamples.forEach((s) => console.log(`  ${s}`));
  }
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
