/**
 * Top Searched/Viewed Products report — Mission 03 (Decision Engine), TESTE FINAL.
 *
 * Read-only. `buyer_events` has no direct "product was searched for" signal
 * (SearchPerformed carries only `search_query`, a free-text string, never a
 * resolved product_id) — the closest real, honest proxy for "most searched
 * products" is ProductClicked (fired once per product-page view by
 * ProductViewTracker), counted per product_id. Reported as what it actually
 * is, not relabeled as literal search volume.
 *
 * Uso:
 *   npx tsx scripts/top-searched-products-report.ts
 */

import { getServiceClient } from "./lib/client";

const PAGE_SIZE = 1000;
const TOP_N = 20;

async function fetchAllProductClickedEvents(supabase: ReturnType<typeof getServiceClient>) {
  const rows: { product_id: string | null }[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("buyer_events")
      .select("product_id")
      .eq("event_type", "ProductClicked")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`[top-searched-products-report] buyer_events query failed: ${error.message}`);
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchSearchQueryCount(supabase: ReturnType<typeof getServiceClient>): Promise<number> {
  const { count, error } = await supabase
    .from("buyer_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "SearchPerformed");

  if (error) throw new Error(`[top-searched-products-report] search count query failed: ${error.message}`);
  return count ?? 0;
}

async function fetchProductDetails(supabase: ReturnType<typeof getServiceClient>, ids: string[]) {
  const map = new Map<string, { name: string; slug: string; specifications: Record<string, string> | null; brand_id: string | null; category_id: string | null }>();
  const CHUNK = 200;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const { data, error } = await supabase.from("products").select("id, name, slug, specifications, brand_id, category_id").in("id", chunk);
    if (error) throw new Error(`[top-searched-products-report] products query failed: ${error.message}`);
    for (const row of data ?? []) {
      map.set(row.id as string, {
        name: row.name as string,
        slug: row.slug as string,
        specifications: row.specifications as Record<string, string> | null,
        brand_id: row.brand_id as string | null,
        category_id: row.category_id as string | null,
      });
    }
  }
  return map;
}

async function fetchOfferDetails(supabase: ReturnType<typeof getServiceClient>, productIds: string[]) {
  const map = new Map<string, { count: number; conditions: Set<string>; hasStockQty: boolean }>();
  const CHUNK = 200;
  for (let i = 0; i < productIds.length; i += CHUNK) {
    const chunk = productIds.slice(i, i + CHUNK);
    const { data, error } = await supabase.from("offers").select("product_id, condition, stock_quantity").in("product_id", chunk);
    if (error) throw new Error(`[top-searched-products-report] offers query failed: ${error.message}`);
    for (const row of data ?? []) {
      const pid = row.product_id as string;
      const entry = map.get(pid) ?? { count: 0, conditions: new Set<string>(), hasStockQty: false };
      entry.count += 1;
      if (row.condition) entry.conditions.add(row.condition as string);
      if (row.stock_quantity !== null) entry.hasStockQty = true;
      map.set(pid, entry);
    }
  }
  return map;
}

async function fetchCanonicalLinks(supabase: ReturnType<typeof getServiceClient>, productIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const id of productIds) {
    const { data } = await supabase.from("offers").select("canonical_product_id").eq("product_id", id).not("canonical_product_id", "is", null).limit(1);
    if (data && data.length > 0 && data[0].canonical_product_id) map.set(id, data[0].canonical_product_id as string);
  }
  return map;
}

async function fetchFactCounts(supabase: ReturnType<typeof getServiceClient>, canonicalIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const cid of canonicalIds) {
    const { count } = await supabase
      .from("marketplace_memory_facts")
      .select("id", { count: "exact", head: true })
      .eq("canonical_product_id", cid);
    map.set(cid, count ?? 0);
  }
  return map;
}

async function main() {
  const supabase = getServiceClient();

  const [clickEvents, searchCount, totalProducts] = await Promise.all([
    fetchAllProductClickedEvents(supabase),
    fetchSearchQueryCount(supabase),
    supabase.from("products").select("id", { count: "exact", head: true }),
  ]);

  console.log(`Total de linhas em buyer_events (event_type=ProductClicked): ${clickEvents.length}`);
  console.log(`Total de linhas em buyer_events (event_type=SearchPerformed): ${searchCount}`);
  console.log(`Total de produtos no catálogo: ${totalProducts.count ?? "desconhecido"}`);

  const countByProduct = new Map<string, number>();
  for (const row of clickEvents) {
    if (!row.product_id) continue;
    countByProduct.set(row.product_id, (countByProduct.get(row.product_id) ?? 0) + 1);
  }

  const ranked = [...countByProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N);
  const ids = ranked.map(([id]) => id);
  const details = await fetchProductDetails(supabase, ids);
  const offerDetails = await fetchOfferDetails(supabase, ids);
  const canonicalLinks = await fetchCanonicalLinks(supabase, ids);
  const factCounts = await fetchFactCounts(supabase, [...new Set(canonicalLinks.values())]);

  console.log(`\nDos ${ranked.length} produtos do Top ${TOP_N}, ${canonicalLinks.size} têm pelo menos uma oferta vinculada a um canonical_product (Product Identity).`);

  console.log(`\nTop ${ranked.length} produtos por ProductClicked (proxy real de popularidade):`);
  ranked.forEach(([id, count], i) => {
    const info = details.get(id);
    const offers = offerDetails.get(id);
    const specCount = info?.specifications ? Object.keys(info.specifications).length : 0;
    const conditions = offers ? [...offers.conditions].join(",") || "—" : "—";
    const canonicalId = canonicalLinks.get(id);
    const facts = canonicalId ? factCounts.get(canonicalId) ?? 0 : 0;
    console.log(
      `${i + 1}. [${count}x clicks | ${offers?.count ?? 0} ofertas | ${specCount} raw specs | ${facts} learned facts | condition: ${conditions}] ${info ? `${info.name} (/product/${info.slug})` : id}`
    );
  });
}

main();
