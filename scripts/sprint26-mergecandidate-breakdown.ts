import { getServiceClient } from "./lib/client";

async function main() {
  const supabase = getServiceClient();
  const candidates: { id: string; source_canonical_product_id: string; target_canonical_product_id: string; confidence: number; status: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("merge_candidates")
      .select("id, source_canonical_product_id, target_canonical_product_id, confidence, status")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    candidates.push(...(data as typeof candidates));
    if (data.length < 1000) break;
  }
  const { data: stores } = await supabase.from("stores").select("id, slug");
  const storeById = new Map((stores ?? []).map((s) => [s.id as string, s.slug as string]));

  const canonicalIds = new Set<string>();
  for (const c of candidates) {
    canonicalIds.add(c.source_canonical_product_id as string);
    canonicalIds.add(c.target_canonical_product_id as string);
  }
  const idList = [...canonicalIds];
  const canonicalStores = new Map<string, Set<string>>();
  for (let i = 0; i < idList.length; i += 300) {
    const chunk = idList.slice(i, i + 300);
    const { data: offers } = await supabase.from("offers").select("canonical_product_id, store_id").in("canonical_product_id", chunk);
    for (const o of offers ?? []) {
      const cid = o.canonical_product_id as string;
      if (!canonicalStores.has(cid)) canonicalStores.set(cid, new Set());
      canonicalStores.get(cid)!.add(storeById.get(o.store_id as string) ?? (o.store_id as string));
    }
  }

  let crossMerchant = 0;
  let intraStore = 0;
  let unknown = 0;
  const crossExamples: string[] = [];
  const confBuckets: Record<string, number> = {};

  for (const c of candidates) {
    const sStores = canonicalStores.get(c.source_canonical_product_id as string) ?? new Set();
    const tStores = canonicalStores.get(c.target_canonical_product_id as string) ?? new Set();
    const union = new Set([...sStores, ...tStores]);
    if (union.size === 0) {
      unknown++;
    } else if (union.size >= 2) {
      crossMerchant++;
      if (crossExamples.length < 15) crossExamples.push(`${c.id} conf=${c.confidence} status=${c.status} stores=[${[...union].join(",")}]`);
    } else {
      intraStore++;
    }
    const bucket = c.confidence >= 95 ? "95-100 (auto)" : c.confidence >= 85 ? "85-94 (probable)" : "70-84 (possible)";
    confBuckets[bucket] = (confBuckets[bucket] ?? 0) + 1;
  }

  console.log(`Total merge_candidates: ${(candidates).length}`);
  console.log(`Cross-merchant (2+ distinct stores involved): ${crossMerchant}`);
  console.log(`Intra-store (1 store only): ${intraStore}`);
  console.log(`Unknown (no offers found): ${unknown}`);
  console.log(`Confidence distribution:`, confBuckets);
  console.log(`\nCross-merchant examples:`);
  for (const e of crossExamples) console.log(`  ${e}`);
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
