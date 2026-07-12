/**
 * Product Comparison Validation — Fase 2, Sprint 2.3.
 *
 * Read-only, single-run investigation script. Not wired into package.json
 * (one-off audit, not a recurring report like cpc-report.ts/
 * marketplace-observatory-report.ts) — run directly with tsx if this Sprint
 * needs to be re-verified later.
 *
 * For a fixed sample of strategic products (iPhone, Galaxy, MacBook Air/Pro,
 * AirPods Pro, Apple Watch, PS5, Nintendo Switch):
 *   1. Lists every product row + brand/category + per-store offer +
 *      canonical_product_id (Objetivo 1/2 — the full Merchant -> Offer ->
 *      Canonical Product chain).
 *   2. Checks brand_id / category_id fragmentation across merchants for the
 *      same real-world brand/category name (the hypothesis derived from
 *      reading CanonicalMergeSuggestionService/ProductIdentityEngine: the
 *      brand+category hard gate compares UUIDs, not names).
 *   3. Counts merge_candidates overall and for this sample specifically
 *      (Objetivo 3).
 *   4. Samples product_identity_match_log for near-miss evaluations on this
 *      sample — shows why a pair scored below the "possible" threshold, using
 *      the penalties already recorded (no recomputation).
 *
 * No writes. No merges. No Product Identity/Shadow Mode changes.
 *
 * Uso: npx tsx scripts/product-comparison-audit.ts
 */

import { getServiceClient } from "./lib/client";

const STRATEGIC_PRODUCTS: { label: string; pattern: string; exclude?: string[] }[] = [
  { label: "iPhone 17 Pro Max", pattern: "%iphone%17%pro%max%" },
  { label: "iPhone 17 Pro", pattern: "%iphone%17%pro%", exclude: ["max"] },
  { label: "Samsung Galaxy Ultra", pattern: "%galaxy%ultra%" },
  { label: "Samsung Galaxy (geral)", pattern: "%galaxy%" },
  { label: "MacBook Air", pattern: "%macbook%air%" },
  { label: "MacBook Pro", pattern: "%macbook%pro%" },
  { label: "AirPods Pro", pattern: "%airpods%pro%" },
  { label: "Apple Watch", pattern: "%apple%watch%" },
  { label: "PlayStation 5", pattern: "%playstation%5%" },
  { label: "Nintendo Switch", pattern: "%nintendo%switch%" },
];

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  brand_id: string | null;
  category_id: string | null;
  specifications: Record<string, string> | null;
}

async function main() {
  const supabase = getServiceClient();

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Sprint 2.3 — Product Comparison Validation Audit         ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const [{ data: stores }, { data: brands }, { data: categories }] = await Promise.all([
    supabase.from("stores").select("id, slug, name"),
    supabase.from("brands").select("id, slug, name"),
    supabase.from("categories").select("id, slug, name"),
  ]);

  const storeById = new Map((stores ?? []).map((s) => [s.id as string, s]));
  const brandById = new Map((brands ?? []).map((b) => [b.id as string, b]));
  const categoryById = new Map((categories ?? []).map((c) => [c.id as string, c]));

  const allStrategicProductIds = new Set<string>();
  const strategicCanonicalIds = new Set<string>();
  const perProductRows: { label: string; products: ProductRow[] }[] = [];

  console.log("── SEÇÃO 1: Inventário de produtos estratégicos (Merchant -> Offer -> Canonical) ──\n");

  for (const sp of STRATEGIC_PRODUCTS) {
    const { data: matches, error } = await supabase
      .from("products")
      .select("id, slug, name, brand_id, category_id, specifications")
      .ilike("name", sp.pattern);
    if (error) throw new Error(`[products] ${error.message}`);

    let filtered = (matches ?? []) as ProductRow[];
    if (sp.exclude) {
      filtered = filtered.filter((p) => !sp.exclude!.some((ex) => p.name.toLowerCase().includes(ex)));
    }

    perProductRows.push({ label: sp.label, products: filtered });
    console.log(`\n=== ${sp.label} — ${filtered.length} produto(s) no catálogo ===`);

    if (filtered.length === 0) continue;

    const productIds = filtered.map((p) => p.id);
    productIds.forEach((id) => allStrategicProductIds.add(id));

    const { data: offers, error: offersError } = await supabase
      .from("offers")
      .select("id, product_id, store_id, canonical_product_id, price_usd, in_stock")
      .in("product_id", productIds);
    if (offersError) throw new Error(`[offers] ${offersError.message}`);

    const offersByProduct = new Map<string, typeof offers>();
    for (const o of offers ?? []) {
      const key = o.product_id as string;
      if (!offersByProduct.has(key)) offersByProduct.set(key, []);
      offersByProduct.get(key)!.push(o);
      if (o.canonical_product_id) strategicCanonicalIds.add(o.canonical_product_id as string);
    }

    for (const p of filtered) {
      const brand = p.brand_id ? brandById.get(p.brand_id) : null;
      const category = p.category_id ? categoryById.get(p.category_id) : null;
      const rowOffers = offersByProduct.get(p.id) ?? [];
      console.log(`  · "${p.name}"`);
      console.log(
        `      slug=${p.slug} brand=${brand ? `${brand.name}(${brand.slug})/${p.brand_id}` : "NULL"} category=${category ? `${category.name}(${category.slug})/${p.category_id}` : "NULL"}`
      );
      console.log(`      specs=${JSON.stringify(p.specifications ?? {})}`);
      for (const o of rowOffers) {
        const store = storeById.get(o.store_id as string);
        console.log(
          `      -> offer ${o.id} store=${store?.slug ?? o.store_id} price_usd=${o.price_usd} in_stock=${o.in_stock} canonical_product_id=${o.canonical_product_id ?? "NULL"}`
        );
      }
    }
  }

  // ── SEÇÃO 2: Fragmentação de brand_id/category_id entre merchants ──
  console.log("\n\n── SEÇÃO 2: Fragmentação de brand_id / category_id ──\n");

  const brandNamesOfInterest = ["apple", "samsung", "sony", "nintendo"];
  for (const name of brandNamesOfInterest) {
    const rows = (brands ?? []).filter((b) => (b.name as string).toLowerCase().includes(name) || (b.slug as string).toLowerCase().includes(name));
    console.log(`  Brand "${name}": ${rows.length} linha(s) distinta(s) na tabela brands`);
    for (const r of rows) console.log(`      id=${r.id} slug=${r.slug} name="${r.name}"`);
  }

  const categoryIdsUsedByStrategicProducts = new Set<string>();
  for (const group of perProductRows) {
    for (const p of group.products) {
      if (p.category_id) categoryIdsUsedByStrategicProducts.add(p.category_id);
    }
  }
  console.log(`\n  category_id distintos usados pelos produtos estratégicos: ${categoryIdsUsedByStrategicProducts.size}`);
  for (const catId of categoryIdsUsedByStrategicProducts) {
    const cat = categoryById.get(catId);
    console.log(`      id=${catId} slug=${cat?.slug} name="${cat?.name}"`);
  }
  const nullCategoryStrategic = perProductRows.reduce(
    (sum, g) => sum + g.products.filter((p) => !p.category_id).length,
    0
  );
  console.log(`  produtos estratégicos com category_id NULL: ${nullCategoryStrategic}`);

  // ── SEÇÃO 3: merge_candidates — contagem total e para a amostra ──
  console.log("\n\n── SEÇÃO 3: merge_candidates ──\n");

  const { count: totalMergeCandidates } = await supabase
    .from("merge_candidates")
    .select("*", { count: "exact", head: true });
  console.log(`  Total merge_candidates (todos os status, marketplace inteiro): ${totalMergeCandidates}`);

  const { data: allCandidates } = await supabase
    .from("merge_candidates")
    .select("id, source_canonical_product_id, target_canonical_product_id, confidence, status, matched_attributes, mismatched_attributes, reason");

  const statusCounts = new Map<string, number>();
  for (const c of allCandidates ?? []) {
    statusCounts.set(c.status as string, (statusCounts.get(c.status as string) ?? 0) + 1);
  }
  console.log(`  Distribuição por status: ${JSON.stringify(Object.fromEntries(statusCounts))}`);

  const strategicCandidates = (allCandidates ?? []).filter(
    (c) =>
      strategicCanonicalIds.has(c.source_canonical_product_id as string) ||
      strategicCanonicalIds.has(c.target_canonical_product_id as string)
  );
  console.log(`  merge_candidates envolvendo canonical products da amostra estratégica: ${strategicCandidates.length}`);
  for (const c of strategicCandidates) {
    console.log(
      `      ${c.id} conf=${c.confidence} status=${c.status} matched=[${c.matched_attributes}] mismatched=[${c.mismatched_attributes}]`
    );
    console.log(`        reason: ${c.reason}`);
  }

  // ── SEÇÃO 4: product_identity_match_log — near-misses na amostra ──
  console.log("\n\n── SEÇÃO 4: product_identity_match_log — amostra estratégica ──\n");

  const slugFragments = ["iphone", "galaxy", "macbook", "airpods", "watch", "playstation", "switch"];
  for (const frag of slugFragments) {
    const { data: logRows, error: logErr } = await supabase
      .from("product_identity_match_log")
      .select(
        "candidate_slug, candidate_store_slug, suggested_product_slug, confidence_score, tier, matched_attributes, mismatched_attributes, penalties, final_decision"
      )
      .ilike("candidate_slug", `%${frag}%`)
      .order("confidence_score", { ascending: false })
      .limit(15);
    if (logErr) {
      console.log(`  [${frag}] erro: ${logErr.message}`);
      continue;
    }
    console.log(`\n  Fragmento "${frag}": ${logRows?.length ?? 0} linha(s) (top 15 por confiança)`);
    for (const r of logRows ?? []) {
      console.log(
        `      slug=${r.candidate_slug} store=${r.candidate_store_slug} -> suggested=${r.suggested_product_slug ?? "none"} conf=${r.confidence_score} tier=${r.tier} decision=${r.final_decision}`
      );
      console.log(`        matched=[${r.matched_attributes}] mismatched=[${r.mismatched_attributes}]`);
      if (r.penalties && (r.penalties as unknown[]).length > 0) {
        console.log(`        penalties: ${JSON.stringify(r.penalties)}`);
      }
    }
  }

  // ── SEÇÃO 5: category_id fill-rate geral (canonical_products) ──
  console.log("\n\n── SEÇÃO 5: category_id fill-rate geral ──\n");
  const { count: canonicalTotal } = await supabase.from("canonical_products").select("*", { count: "exact", head: true });
  const { count: canonicalWithCategory } = await supabase
    .from("canonical_products")
    .select("*", { count: "exact", head: true })
    .not("category_id", "is", null);
  console.log(`  canonical_products total: ${canonicalTotal}`);
  console.log(
    `  canonical_products com category_id: ${canonicalWithCategory} (${(((canonicalWithCategory ?? 0) / (canonicalTotal || 1)) * 100).toFixed(2)}%)`
  );

  console.log("\n[product-comparison-audit] done.");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
