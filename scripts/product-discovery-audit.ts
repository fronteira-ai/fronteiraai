/**
 * MISSION Ω-PRODUCT DISCOVERY — read-only data gathering.
 *
 * 100% read-only. No writes, no schema changes. Measures catalog/canonical/
 * offers/merge/coverage (brand, category, specifications, images, prices,
 * history) directly against production to ground a product-strategy
 * decision in real numbers, not opinion.
 *
 * Uso:
 *   npx tsx scripts/product-discovery-audit.ts
 */

import { getServiceClient } from "./lib/client";

const PAGE = 1000;
async function fetchAll<T>(fn: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  let all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await fn(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
  }
  return all;
}

function pct(n: number, d: number): string {
  return d === 0 ? "n/a" : `${((n / d) * 100).toFixed(1)}%`;
}

async function main() {
  const supabase = getServiceClient();
  console.log("=".repeat(80));
  console.log("MISSION Ω-PRODUCT DISCOVERY (read-only)");
  console.log("=".repeat(80));

  // ── A. CATÁLOGO ─────────────────────────────────────────────────────
  console.log("\n### A. CATÁLOGO ###\n");

  const products = await fetchAll<{ id: string; brand_id: string | null; category_id: string | null; specifications: Record<string, string> | null; image_url: string | null }>(
    async (from, to) => supabase.from("products").select("id, brand_id, category_id, specifications, image_url").range(from, to)
  );
  const offers = await fetchAll<{ id: string; product_id: string; store_id: string; canonical_product_id: string | null; price_usd: number | null; price_brl: number | null; in_stock: boolean }>(
    async (from, to) => supabase.from("offers").select("id, product_id, store_id, canonical_product_id, price_usd, price_brl, in_stock").range(from, to)
  );
  const canonicalRows = await fetchAll<{ id: string; is_active: boolean; image_url: string | null; brand_id: string | null; category_id: string | null; specifications: Record<string, string> | null }>(
    async (from, to) => supabase.from("canonical_products").select("id, is_active, image_url, brand_id, category_id, specifications").range(from, to)
  );
  const stores = await fetchAll<{ id: string; name: string; slug: string }>(async (from, to) => supabase.from("stores").select("id, name, slug").range(from, to));
  const { count: brandsCount } = await supabase.from("brands").select("*", { count: "exact", head: true });
  const { count: categoriesCount } = await supabase.from("categories").select("*", { count: "exact", head: true });

  console.log(`products=${products.length} offers=${offers.length} canonical_products=${canonicalRows.length} (active=${canonicalRows.filter((c) => c.is_active).length}) brands=${brandsCount} categories=${categoriesCount} stores=${stores.length}`);

  const storeById = new Map(stores.map((s) => [s.id, s]));
  const byStore = new Map<string, { total: number; linked: number }>();
  for (const o of offers) {
    const cur = byStore.get(o.store_id) ?? { total: 0, linked: 0 };
    cur.total++;
    if (o.canonical_product_id) cur.linked++;
    byStore.set(o.store_id, cur);
  }
  console.log("Offers por loja (total / linkadas ao Canonical Catalog):");
  for (const [storeId, v] of byStore) console.log(`  ${storeById.get(storeId)?.name ?? storeId}: ${v.total} (${pct(v.linked, v.total)} linkadas)`);

  // ── B. CANONICAL CATALOG / MERGE CANDIDATES ─────────────────────────
  console.log("\n### B. CANONICAL CATALOG / MERGE CANDIDATES ###\n");
  const canonicalStores = new Map<string, Set<string>>();
  for (const o of offers) {
    if (!o.canonical_product_id) continue;
    const s = canonicalStores.get(o.canonical_product_id) ?? new Set<string>();
    s.add(o.store_id);
    canonicalStores.set(o.canonical_product_id, s);
  }
  const activeCanonical = canonicalRows.filter((c) => c.is_active);
  const grouped = activeCanonical.filter((c) => (canonicalStores.get(c.id)?.size ?? 0) >= 2);
  console.log(`Comparable Product Coverage (canonical com >=2 lojas / canonical ativos): ${grouped.length}/${activeCanonical.length} = ${pct(grouped.length, activeCanonical.length)}`);

  const mergeCandidates = await fetchAll<{ status: string }>(async (from, to) => supabase.from("merge_candidates").select("status").range(from, to));
  const mcByStatus: Record<string, number> = {};
  for (const mc of mergeCandidates) mcByStatus[mc.status] = (mcByStatus[mc.status] ?? 0) + 1;
  console.log("merge_candidates por status:", mcByStatus);

  const pendingReviews = await fetchAll<{ status: string }>(async (from, to) => supabase.from("catalog_pending_reviews").select("status").range(from, to));
  const prByStatus: Record<string, number> = {};
  for (const p of pendingReviews) prByStatus[p.status] = (prByStatus[p.status] ?? 0) + 1;
  console.log("catalog_pending_reviews por status:", prByStatus);

  // ── C. COBERTURA DE MARCAS ──────────────────────────────────────────
  console.log("\n### C. COBERTURA DE MARCAS ###\n");
  const brands = await fetchAll<{ id: string; name: string }>(async (from, to) => supabase.from("brands").select("id, name").range(from, to));
  const brandNameById = new Map(brands.map((b) => [b.id, b.name]));
  const FORBIDDEN_BRAND_NAMES = new Set(["outros", "outro", "diversos", "generico", "genérico", "sem marca", "n/a", "na", "-"]);
  const productsWithNoBrand = products.filter((p) => !p.brand_id).length;
  const productsWithForbiddenBrand = products.filter((p) => p.brand_id && FORBIDDEN_BRAND_NAMES.has((brandNameById.get(p.brand_id) ?? "").trim().toLowerCase())).length;
  console.log(`Produtos sem brand_id: ${productsWithNoBrand} (${pct(productsWithNoBrand, products.length)})`);
  console.log(`Produtos com brand "forbidden"-like (Outros/Genérico/etc): ${productsWithForbiddenBrand} (${pct(productsWithForbiddenBrand, products.length)})`);

  const brandProductCounts = new Map<string, number>();
  for (const p of products) {
    if (!p.brand_id) continue;
    brandProductCounts.set(p.brand_id, (brandProductCounts.get(p.brand_id) ?? 0) + 1);
  }
  const topBrands = [...brandProductCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log("Top 10 marcas por contagem de produtos:");
  for (const [brandId, count] of topBrands) console.log(`  ${brandNameById.get(brandId) ?? brandId}: ${count} (${pct(count, products.length)})`);

  // ── D. COBERTURA DE CATEGORIAS ───────────────────────────────────────
  console.log("\n### D. COBERTURA DE CATEGORIAS ###\n");
  const categories = await fetchAll<{ id: string; name: string; slug: string }>(async (from, to) => supabase.from("categories").select("id, name, slug").range(from, to));
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const FORBIDDEN_CATEGORY_NAMES = new Set(["general", "geral", "outros", "diversos", "sem categoria", "n/a", "na", "-"]);
  const productsWithNoCategory = products.filter((p) => !p.category_id).length;
  const productsWithForbiddenCategory = products.filter((p) => p.category_id && FORBIDDEN_CATEGORY_NAMES.has((categoryNameById.get(p.category_id) ?? "").trim().toLowerCase())).length;
  console.log(`Produtos sem category_id: ${productsWithNoCategory} (${pct(productsWithNoCategory, products.length)})`);
  console.log(`Produtos com category "forbidden"-like (GENERAL/Outros/etc): ${productsWithForbiddenCategory} (${pct(productsWithForbiddenCategory, products.length)})`);
  console.log(`Total de categorias distintas cadastradas: ${categories.length}`);

  const categoryProductCounts = new Map<string, number>();
  for (const p of products) {
    if (!p.category_id) continue;
    categoryProductCounts.set(p.category_id, (categoryProductCounts.get(p.category_id) ?? 0) + 1);
  }
  console.log(`Categorias com pelo menos 1 produto: ${categoryProductCounts.size} de ${categories.length} cadastradas`);
  console.log(`Categorias com exatamente 1 produto (fragmentação): ${[...categoryProductCounts.values()].filter((n) => n === 1).length}`);

  // ── E. COBERTURA DE ESPECIFICAÇÕES ──────────────────────────────────
  console.log("\n### E. COBERTURA DE ESPECIFICAÇÕES ###\n");
  const withSpecs = products.filter((p) => p.specifications && Object.keys(p.specifications).length > 0);
  console.log(`Produtos com specifications não-vazio: ${withSpecs.length} (${pct(withSpecs.length, products.length)})`);
  const specKeyCounts = withSpecs.map((p) => Object.keys(p.specifications!).length);
  const avgSpecKeys = specKeyCounts.length > 0 ? specKeyCounts.reduce((a, b) => a + b, 0) / specKeyCounts.length : 0;
  console.log(`Média de chaves de specifications (entre os que têm): ${avgSpecKeys.toFixed(2)}`);
  const distinctSpecKeys = new Set<string>();
  for (const p of withSpecs) for (const k of Object.keys(p.specifications!)) distinctSpecKeys.add(k);
  console.log(`Chaves distintas de specifications em todo o catálogo: ${distinctSpecKeys.size} (fragmentação de nomenclatura, ex.: "COR"/"Color"/"cor")`);

  // ── F. COBERTURA DE IMAGENS ─────────────────────────────────────────
  console.log("\n### F. COBERTURA DE IMAGENS ###\n");
  const productsWithImage = products.filter((p) => p.image_url && p.image_url.trim().length > 0).length;
  console.log(`Produtos com image_url: ${productsWithImage} (${pct(productsWithImage, products.length)})`);
  const canonicalWithImage = canonicalRows.filter((c) => c.image_url && c.image_url.trim().length > 0).length;
  console.log(`Canonical products com image_url: ${canonicalWithImage} (${pct(canonicalWithImage, canonicalRows.length)})`);

  // ── G. COBERTURA DE PREÇOS ───────────────────────────────────────────
  console.log("\n### G. COBERTURA DE PREÇOS ###\n");
  const offersWithPrice = offers.filter((o) => typeof o.price_usd === "number" && o.price_usd > 0).length;
  const offersWithBRL = offers.filter((o) => typeof o.price_brl === "number" && o.price_brl! > 0).length;
  const offersInStock = offers.filter((o) => o.in_stock).length;
  console.log(`Offers com price_usd válido: ${offersWithPrice} (${pct(offersWithPrice, offers.length)})`);
  console.log(`Offers com price_brl válido: ${offersWithBRL} (${pct(offersWithBRL, offers.length)})`);
  console.log(`Offers em estoque (in_stock=true): ${offersInStock} (${pct(offersInStock, offers.length)})`);

  // ── H. COBERTURA DE HISTÓRICO ───────────────────────────────────────
  console.log("\n### H. COBERTURA DE HISTÓRICO ###\n");
  const { count: priceHistoryCount } = await supabase.from("price_history").select("*", { count: "exact", head: true });
  const priceHistoryOfferIds = await fetchAll<{ offer_id: string }>(async (from, to) => supabase.from("price_history").select("offer_id").range(from, to));
  const distinctOffersWithHistory = new Set(priceHistoryOfferIds.map((r) => r.offer_id));
  console.log(`Total de linhas em price_history: ${priceHistoryCount}`);
  console.log(`Offers com >=1 entrada de price_history: ${distinctOffersWithHistory.size} de ${offers.length} (${pct(distinctOffersWithHistory.size, offers.length)})`);
  const avgHistoryPerOffer = distinctOffersWithHistory.size > 0 ? (priceHistoryCount ?? 0) / distinctOffersWithHistory.size : 0;
  console.log(`Média de entradas de histórico por offer (entre as que têm): ${avgHistoryPerOffer.toFixed(2)}`);

  console.log("\n" + "=".repeat(80));
  console.log("FIM — nenhuma escrita realizada.");
  console.log("=".repeat(80));
}

main().catch((err) => {
  console.error("[product-discovery-audit] Fatal:", err);
  process.exit(1);
});
