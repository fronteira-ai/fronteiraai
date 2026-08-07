/**
 * Offer Density report — Mission 04 (Offer Density).
 *
 * Read-only. For products with real ProductClicked history (the honest
 * "most accessed" proxy established in Mission 03), measures real
 * cross-merchant density: for each top product's offer, resolve its
 * canonical_product_id (Product Identity's dedup layer — NOT the raw
 * `products.id`, which is created per-store on import and is therefore
 * almost always 1:1 with a single offer by construction) and count how
 * many distinct offers/stores share that same canonical entry.
 *
 * Uso:
 *   npx tsx scripts/offer-density-report.ts [N]
 */

import { getServiceClient } from "./lib/client";

const PAGE_SIZE = 1000;

async function fetchAllProductClickedEvents(supabase: ReturnType<typeof getServiceClient>) {
  const rows: { product_id: string | null }[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("buyer_events")
      .select("product_id")
      .eq("event_type", "ProductClicked")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...data);
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
  const topN = Number(process.argv[2] ?? 100);
  const supabase = getServiceClient();

  const clickEvents = await fetchAllProductClickedEvents(supabase);
  const countByProduct = new Map<string, number>();
  for (const row of clickEvents) {
    if (!row.product_id) continue;
    countByProduct.set(row.product_id, (countByProduct.get(row.product_id) ?? 0) + 1);
  }

  const ranked = [...countByProduct.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked.slice(0, topN);
  const ids = top.map(([id]) => id);

  console.log(`Produtos distintos com pelo menos 1 ProductClicked real: ${ranked.length}`);
  console.log(`Usando os top ${top.length} (pedido: ${topN})`);

  // Resolve each top product's own canonical_product_id (via its own offer row).
  const canonicalByProduct = new Map<string, string>();
  const CHUNK = 200;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const { data, error } = await supabase.from("offers").select("product_id, canonical_product_id").in("product_id", chunk);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (row.canonical_product_id) canonicalByProduct.set(row.product_id as string, row.canonical_product_id as string);
    }
  }

  const canonicalIds = [...new Set(canonicalByProduct.values())];
  console.log(`Dos ${ids.length}, ${canonicalByProduct.size} têm canonical_product_id (o resto está fora do bootstrap — Shadow Mode total).`);

  // For each canonical id, count distinct offers AND distinct stores.
  const offersByCanonical = new Map<string, { offerCount: number; storeIds: Set<string> }>();
  for (let i = 0; i < canonicalIds.length; i += CHUNK) {
    const chunk = canonicalIds.slice(i, i + CHUNK);
    const { data, error } = await supabase.from("offers").select("canonical_product_id, store_id").in("canonical_product_id", chunk);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const cid = row.canonical_product_id as string;
      const entry = offersByCanonical.get(cid) ?? { offerCount: 0, storeIds: new Set<string>() };
      entry.offerCount += 1;
      entry.storeIds.add(row.store_id as string);
      offersByCanonical.set(cid, entry);
    }
  }

  const storeCounts = ids.map((id) => {
    const cid = canonicalByProduct.get(id);
    if (!cid) return 1; // no canonical link at all — still exactly the 1 offer we know about
    return offersByCanonical.get(cid)?.storeIds.size ?? 1;
  }).sort((a, b) => a - b);

  const mean = storeCounts.reduce((a, b) => a + b, 0) / storeCounts.length;
  const median = percentile(storeCounts, 50);
  const oneStore = storeCounts.filter((c) => c === 1).length;
  const twoPlus = storeCounts.filter((c) => c >= 2).length;
  const fivePlus = storeCounts.filter((c) => c >= 5).length;

  console.log(`\n=== Densidade real (lojas distintas por canonical_product) — top ${storeCounts.length} produtos mais acessados ===`);
  console.log(`Média de lojas por produto: ${mean.toFixed(2)}`);
  console.log(`Mediana: ${median}`);
  console.log(`% com exatamente 1 loja: ${((oneStore / storeCounts.length) * 100).toFixed(1)}%`);
  console.log(`% com 2+ lojas: ${((twoPlus / storeCounts.length) * 100).toFixed(1)}%`);
  console.log(`% com 5+ lojas: ${((fivePlus / storeCounts.length) * 100).toFixed(1)}%`);
  console.log(`Distribuição: ${JSON.stringify(storeCounts)}`);
}

main();
