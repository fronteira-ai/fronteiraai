/**
 * Comparable Product Coverage (CPC) report — PROGRAM Ξ, Wave Ξ-5/Sprint 2.2.
 *
 * Read-only. Computes the KPI set this Wave measures success by: merchants
 * per canonical product, % of products with 2+/3+ offers, Offer Density,
 * and a full merchant-overlap matrix — the same shape as
 * docs/product/MERCHANT_OVERLAP_MATRIX.md (Mission Δ-3), generalized to
 * however many stores are live today instead of hardcoding 4. Sprint 2.2
 * adds a per-category breakdown (Objetivo 3) — same metrics, segmented by
 * canonical_products.category_id.
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

  const [{ count: productsTotal }, { count: offersTotal }, { data: stores }, { data: canonicalProducts }, { data: categories }] =
    await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("offers").select("*", { count: "exact", head: true }),
      supabase.from("stores").select("id, slug, name"),
      supabase.from("canonical_products").select("id, category_id"),
      supabase.from("categories").select("id, name"),
    ]);

  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name as string]));
  const categoryIdByCanonical = new Map(
    (canonicalProducts ?? []).map((c) => [c.id as string, c.category_id as string | null])
  );

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

  // Program Ω — Mission Ω-1, Objetivo 5. Exact histogram by distinct store
  // count per canonical product — the "2 lojas / 3 lojas / 4 lojas / 5+"
  // breakdown the mission asks for, not just the 2+/3+ aggregates above.
  const storeCountHistogram = { 1: 0, 2: 0, 3: 0, 4: 0, "5plus": 0 };
  for (const storeSet of storesByCanonical.values()) {
    const n = storeSet.size;
    if (n === 1) storeCountHistogram[1]++;
    else if (n === 2) storeCountHistogram[2]++;
    else if (n === 3) storeCountHistogram[3]++;
    else if (n === 4) storeCountHistogram[4]++;
    else storeCountHistogram["5plus"]++;
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

  // Per-category breakdown (Sprint 2.2, Objetivo 3) — same comparable-2+/3+
  // definition as the marketplace-wide numbers above, segmented by
  // canonical_products.category_id. "Sem categoria" groups canonical
  // products with a null category_id — named explicitly, not silently
  // dropped.
  interface CategoryStats {
    canonicalWithOffers: number;
    comparable2plus: number;
    comparable3plus: number;
  }
  const byCategory = new Map<string, CategoryStats>();
  for (const [canonicalId, storeSet] of storesByCanonical.entries()) {
    const categoryId = categoryIdByCanonical.get(canonicalId) ?? null;
    const categoryName = categoryId ? (categoryNameById.get(categoryId) ?? `categoria desconhecida (${categoryId})`) : "Sem categoria";
    if (!byCategory.has(categoryName)) byCategory.set(categoryName, { canonicalWithOffers: 0, comparable2plus: 0, comparable3plus: 0 });
    const stats = byCategory.get(categoryName)!;
    stats.canonicalWithOffers++;
    if (storeSet.size >= 2) stats.comparable2plus++;
    if (storeSet.size >= 3) stats.comparable3plus++;
  }

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

  console.log("\n— Store-count histogram (Objetivo 5) —");
  console.log(`  1 loja:   ${storeCountHistogram[1]}`);
  console.log(`  2 lojas:  ${storeCountHistogram[2]}`);
  console.log(`  3 lojas:  ${storeCountHistogram[3]}`);
  console.log(`  4 lojas:  ${storeCountHistogram[4]}`);
  console.log(`  5+ lojas: ${storeCountHistogram["5plus"]}`);

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

  console.log("\n— Comparable Product Coverage por categoria (Sprint 2.2) —");
  const categoryRows = [...byCategory.entries()].sort((a, b) => b[1].canonicalWithOffers - a[1].canonicalWithOffers);
  for (const [name, stats] of categoryRows) {
    const pct2 = stats.canonicalWithOffers ? (stats.comparable2plus / stats.canonicalWithOffers) * 100 : 0;
    const pct3 = stats.canonicalWithOffers ? (stats.comparable3plus / stats.canonicalWithOffers) * 100 : 0;
    console.log(
      `  ${name}: ${stats.canonicalWithOffers} canonical c/ oferta — 2+ merchants ${stats.comparable2plus} (${pct2.toFixed(2)}%), 3+ merchants ${stats.comparable3plus} (${pct3.toFixed(2)}%)`
    );
  }

  console.log("\n[cpc-report] done.");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
