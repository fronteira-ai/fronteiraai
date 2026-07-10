/**
 * Comparable Product Coverage (CPC) report — PROGRAM Ξ, Wave Ξ-5.
 *
 * Read-only. Computes the KPI set this Wave measures success by: merchants
 * per canonical product, % of products with 2+/3+ offers, Offer Density,
 * and a full merchant-overlap matrix — the same shape as
 * docs/product/MERCHANT_OVERLAP_MATRIX.md (Mission Δ-3), generalized to
 * however many stores are live today instead of hardcoding 4.
 *
 * Uso:
 *   npm run cpc:report
 */

import { getServiceClient } from "./lib/client";

const PAGE_SIZE = 1000;

async function fetchAllOffers(supabase: ReturnType<typeof getServiceClient>) {
  const rows: { canonical_product_id: string | null; store_id: string }[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("offers")
      .select("canonical_product_id, store_id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`[cpc-report] offers query failed: ${error.message}`);
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function main() {
  const supabase = getServiceClient();

  const [{ count: productsTotal }, { count: offersTotal }, { data: stores }] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("offers").select("*", { count: "exact", head: true }),
    supabase.from("stores").select("id, slug, name"),
  ]);

  const offers = await fetchAllOffers(supabase);
  const storeById = new Map((stores ?? []).map((s) => [s.id, s]));

  // Group by canonical_product_id -> set of distinct store_id.
  const storesByCanonical = new Map<string, Set<string>>();
  for (const o of offers) {
    if (!o.canonical_product_id) continue;
    if (!storesByCanonical.has(o.canonical_product_id)) storesByCanonical.set(o.canonical_product_id, new Set());
    storesByCanonical.get(o.canonical_product_id)!.add(o.store_id);
  }

  const canonicalWithOffers = storesByCanonical.size;
  let comparable2plus = 0;
  let comparable3plus = 0;
  for (const storeSet of storesByCanonical.values()) {
    if (storeSet.size >= 2) comparable2plus++;
    if (storeSet.size >= 3) comparable3plus++;
  }

  // Per-store offer counts.
  const offersByStore = new Map<string, number>();
  for (const o of offers) {
    offersByStore.set(o.store_id, (offersByStore.get(o.store_id) ?? 0) + 1);
  }

  // Full pairwise merchant overlap matrix (same definition as
  // MERCHANT_OVERLAP_MATRIX.md: canonical products shared by both stores).
  const storeIds = [...offersByStore.keys()];
  const overlapPairs: { a: string; b: string; shared: number; pctOfSmaller: number }[] = [];
  for (let i = 0; i < storeIds.length; i++) {
    for (let j = i + 1; j < storeIds.length; j++) {
      const [a, b] = [storeIds[i], storeIds[j]];
      let shared = 0;
      for (const storeSet of storesByCanonical.values()) {
        if (storeSet.has(a) && storeSet.has(b)) shared++;
      }
      const smaller = Math.min(offersByStore.get(a) ?? 0, offersByStore.get(b) ?? 0);
      overlapPairs.push({ a, b, shared, pctOfSmaller: smaller > 0 ? (shared / smaller) * 100 : 0 });
    }
  }

  const offerDensity = productsTotal ? (offersTotal ?? 0) / productsTotal : 0;

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   Comparable Product Coverage Report — Wave Ξ-5          ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  console.log(`Products total:              ${productsTotal}`);
  console.log(`Offers total:                ${offersTotal}`);
  console.log(`Offer Density:               ${offerDensity.toFixed(4)}`);
  console.log(`Canonical products w/ offer: ${canonicalWithOffers}`);
  console.log(
    `Comparable (2+ merchants):   ${comparable2plus} (${((comparable2plus / canonicalWithOffers) * 100 || 0).toFixed(2)}% of canonical-w/-offer)`
  );
  console.log(
    `Comparable (3+ merchants):   ${comparable3plus} (${((comparable3plus / canonicalWithOffers) * 100 || 0).toFixed(2)}% of canonical-w/-offer)`
  );

  console.log("\n— Per-store offer count —");
  for (const [storeId, count] of [...offersByStore.entries()].sort((x, y) => y[1] - x[1])) {
    const store = storeById.get(storeId);
    console.log(`  ${store?.slug ?? storeId}: ${count} ofertas`);
  }

  console.log("\n— Merchant overlap matrix (canonical products shared) —");
  for (const p of overlapPairs.sort((x, y) => y.shared - x.shared)) {
    const nameA = storeById.get(p.a)?.slug ?? p.a;
    const nameB = storeById.get(p.b)?.slug ?? p.b;
    console.log(`  ${nameA} × ${nameB}: ${p.shared} produtos (${p.pctOfSmaller.toFixed(2)}% do menor catálogo)`);
  }

  console.log("\n[cpc-report] done.");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
