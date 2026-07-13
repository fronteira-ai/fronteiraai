/**
 * PROGRAM Κ (KAPPA) — MISSION Κ-1 — Objetivo 1: Universal Taxonomy Discovery.
 *
 * Read-only inventory script. No writes, no migrations, no schema changes.
 * Pulls every row from `categories` and cross-references `products` (which
 * carries `category_id`) and `offers` (via `products.id`) to compute, per
 * category: product count, offer count, and the merchant(s) whose products
 * use it. `canonical_products.category_id` is inventoried separately because
 * that is the column `CanonicalMergeSuggestionService`/`ProductIdentityEngine`
 * actually gates on (see docs/product/PRODUCT_IDENTITY_DECISION_REPORT.md).
 *
 * Schema note: `categories` (types/category.ts, migration 0002) has no
 * `parent_id` / hierarchy column — this script reports that fact rather than
 * inventing a hierarchy. "Nível hierárquico" in the inventory output is
 * always "flat (schema)".
 *
 * Uso:
 *   npx tsx scripts/kappa1-category-inventory.ts
 */
import { getServiceClient } from "./lib/client";

const PAGE_SIZE = 1000;

async function fetchAll<T>(
  supabase: ReturnType<typeof getServiceClient>,
  table: string,
  columns: string
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`[kappa1-inventory] ${table} query failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  created_at: string;
}
interface ProductRow {
  id: string;
  category_id: string | null;
  brand_id: string | null;
}
interface OfferRow {
  product_id: string;
  store_id: string;
  canonical_product_id: string | null;
}
interface StoreRow {
  id: string;
  slug: string;
  name: string;
}
interface CanonicalRow {
  id: string;
  category_id: string | null;
}

async function main() {
  const supabase = getServiceClient();

  const [categories, products, offers, stores, canonical] = await Promise.all([
    fetchAll<CategoryRow>(supabase, "categories", "id, name, slug, icon, created_at"),
    fetchAll<ProductRow>(supabase, "products", "id, category_id, brand_id"),
    fetchAll<OfferRow>(supabase, "offers", "product_id, store_id, canonical_product_id"),
    fetchAll<StoreRow>(supabase, "stores", "id, slug, name"),
    fetchAll<CanonicalRow>(supabase, "canonical_products", "id, category_id"),
  ]);

  const storeById = new Map(stores.map((s) => [s.id, s]));

  // product_id -> set of store_id (a product can, in theory, appear in
  // offers from more than one store row if two stores scraped the identical
  // products.id, which doesn't happen today but we don't assume it away).
  const storesByProduct = new Map<string, Set<string>>();
  const offerCountByProduct = new Map<string, number>();
  for (const o of offers) {
    if (!storesByProduct.has(o.product_id)) storesByProduct.set(o.product_id, new Set());
    storesByProduct.get(o.product_id)!.add(o.store_id);
    offerCountByProduct.set(o.product_id, (offerCountByProduct.get(o.product_id) ?? 0) + 1);
  }

  interface CategoryStats {
    productCount: number;
    offerCount: number;
    storeCounts: Map<string, number>; // store_id -> product count using this category via that store
  }
  const statsByCategory = new Map<string, CategoryStats>();
  for (const p of products) {
    if (!p.category_id) continue;
    if (!statsByCategory.has(p.category_id)) {
      statsByCategory.set(p.category_id, { productCount: 0, offerCount: 0, storeCounts: new Map() });
    }
    const stats = statsByCategory.get(p.category_id)!;
    stats.productCount++;
    stats.offerCount += offerCountByProduct.get(p.id) ?? 0;
    for (const storeId of storesByProduct.get(p.id) ?? []) {
      stats.storeCounts.set(storeId, (stats.storeCounts.get(storeId) ?? 0) + 1);
    }
  }

  // canonical_products.category_id usage — the column the merge gate reads.
  const canonicalCountByCategory = new Map<string, number>();
  let canonicalNullCategory = 0;
  for (const c of canonical) {
    if (!c.category_id) {
      canonicalNullCategory++;
      continue;
    }
    canonicalCountByCategory.set(c.category_id, (canonicalCountByCategory.get(c.category_id) ?? 0) + 1);
  }

  const categoriesWithNoProducts = categories.filter((c) => !statsByCategory.has(c.id));
  const productsWithNullCategory = products.filter((p) => !p.category_id).length;

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  MISSION Κ-1 — Objetivo 1: Category Inventory             ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  console.log(`Categorias (linhas em \`categories\`): ${categories.length}`);
  console.log(`Categorias com pelo menos 1 produto:   ${statsByCategory.size}`);
  console.log(`Categorias sem nenhum produto (órfãs):  ${categoriesWithNoProducts.length}`);
  console.log(`Produtos com category_id nulo:          ${productsWithNullCategory} / ${products.length}`);
  console.log(`canonical_products com category_id nulo: ${canonicalNullCategory} / ${canonical.length}`);
  console.log(`Nível hierárquico: schema \`categories\` não tem parent_id — 100% flat.\n`);

  const rows = categories.map((c) => {
    const stats = statsByCategory.get(c.id);
    const canonicalCount = canonicalCountByCategory.get(c.id) ?? 0;
    let dominantStore = "—";
    let storeSpread = 0;
    if (stats && stats.storeCounts.size > 0) {
      storeSpread = stats.storeCounts.size;
      const [topStoreId] = [...stats.storeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      dominantStore = storeById.get(topStoreId)?.slug ?? topStoreId;
    }
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      productCount: stats?.productCount ?? 0,
      offerCount: stats?.offerCount ?? 0,
      canonicalCount,
      dominantStore,
      storeSpread,
    };
  });

  rows.sort((a, b) => b.productCount - a.productCount);

  console.log("— Top 40 categorias por contagem de produtos —");
  console.log(
    "name | slug | products | offers | canonical_products | merchant dominante | # merchants distintos"
  );
  for (const r of rows.slice(0, 40)) {
    console.log(
      `${r.name} | ${r.slug} | ${r.productCount} | ${r.offerCount} | ${r.canonicalCount} | ${r.dominantStore} | ${r.storeSpread}`
    );
  }

  console.log(`\n— Categorias usadas por mais de 1 merchant (storeSpread >= 2) —`);
  const multiMerchant = rows.filter((r) => r.storeSpread >= 2);
  console.log(`Total: ${multiMerchant.length} / ${rows.length}`);
  for (const r of multiMerchant) {
    console.log(`  ${r.name} (${r.slug}) — ${r.storeSpread} merchants, ${r.productCount} produtos`);
  }

  console.log(`\n— Categorias singleton (1 produto só) —`);
  const singletons = rows.filter((r) => r.productCount === 1);
  console.log(`Total: ${singletons.length} / ${rows.length}`);

  console.log(`\n— Distribuição de categorias por merchant exclusivo (storeSpread === 1) —`);
  const exclusiveByStore = new Map<string, number>();
  for (const r of rows.filter((x) => x.storeSpread === 1)) {
    const stats = statsByCategory.get(r.id)!;
    const [storeId] = [...stats.storeCounts.keys()];
    const slug = storeById.get(storeId)?.slug ?? storeId;
    exclusiveByStore.set(slug, (exclusiveByStore.get(slug) ?? 0) + 1);
  }
  for (const [slug, count] of [...exclusiveByStore.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${slug}: ${count} categorias exclusivas`);
  }

  // Dump full CSV-ish payload to stdout tail so it can be captured for the report.
  console.log(`\n— INVENTÁRIO COMPLETO (${rows.length} linhas) —`);
  console.log("id,name,slug,productCount,offerCount,canonicalCount,dominantStore,storeSpread");
  for (const r of rows) {
    const safeName = r.name.replace(/,/g, ";");
    console.log(`${r.id},${safeName},${r.slug},${r.productCount},${r.offerCount},${r.canonicalCount},${r.dominantStore},${r.storeSpread}`);
  }

  console.log("\n[kappa1-category-inventory] done.");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
