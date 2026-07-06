import type { SupabaseClient } from "@supabase/supabase-js";
import type { CoverageGroupCount } from "../types/coverage.types";

export interface CatalogCounts {
  products: number;
  offers: number;
  canonicalProducts: number;
  brands: number;
  categories: number;
  canonicalBootstrapPct: number;
}

export async function getCatalogCounts(client: SupabaseClient): Promise<CatalogCounts> {
  const [productsRes, offersRes, canonicalRes, brandsRes, categoriesRes, linkedOffersRes] = await Promise.all([
    client.from("products").select("id", { count: "exact", head: true }),
    client.from("offers").select("id", { count: "exact", head: true }),
    client.from("canonical_products").select("id", { count: "exact", head: true }),
    client.from("brands").select("id", { count: "exact", head: true }),
    client.from("categories").select("id", { count: "exact", head: true }),
    client.from("offers").select("id", { count: "exact", head: true }).not("canonical_product_id", "is", null),
  ]);

  const offers = offersRes.count ?? 0;
  const linked = linkedOffersRes.count ?? 0;

  return {
    products: productsRes.count ?? 0,
    offers,
    canonicalProducts: canonicalRes.count ?? 0,
    brands: brandsRes.count ?? 0,
    categories: categoriesRes.count ?? 0,
    canonicalBootstrapPct: offers > 0 ? Math.round((linked / offers) * 100) : 0,
  };
}

// NOTE (scale, Epic 10): fetches every product's category_id/brand_id into
// memory to count group sizes — fine at today's catalog size, but at the
// 500k-product target this should become a SQL GROUP BY / RPC, not a JS
// reduce. Documented in docs/engineering/MARKETPLACE_FOUNDATION_SCALE_AUDIT.md.
export async function getCategoryCoverage(client: SupabaseClient): Promise<CoverageGroupCount[]> {
  const [categoriesRes, productsRes] = await Promise.all([
    client.from("categories").select("id, name"),
    client.from("products").select("category_id"),
  ]);

  const counts = new Map<string, number>();
  for (const row of (productsRes.data ?? []) as { category_id: string | null }[]) {
    if (!row.category_id) continue;
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  return ((categoriesRes.data ?? []) as { id: string; name: string }[]).map((c) => ({
    id: c.id,
    name: c.name,
    productCount: counts.get(c.id) ?? 0,
  }));
}

export async function getBrandCoverage(client: SupabaseClient): Promise<CoverageGroupCount[]> {
  const [brandsRes, productsRes] = await Promise.all([
    client.from("brands").select("id, name"),
    client.from("products").select("brand_id"),
  ]);

  const counts = new Map<string, number>();
  for (const row of (productsRes.data ?? []) as { brand_id: string | null }[]) {
    if (!row.brand_id) continue;
    counts.set(row.brand_id, (counts.get(row.brand_id) ?? 0) + 1);
  }

  return ((brandsRes.data ?? []) as { id: string; name: string }[]).map((b) => ({
    id: b.id,
    name: b.name,
    productCount: counts.get(b.id) ?? 0,
  }));
}
