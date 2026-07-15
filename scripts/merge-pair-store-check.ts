/**
 * One-off, read-only: for every 'alta' confidence pending merge_candidate,
 * check whether the source/target canonical products are sold by the same
 * store(s) or different ones — intra-store merges clean up catalog
 * duplicates but never move Comparable Product Coverage; cross-store
 * merges are the only ones that do. Needed to interpret the Ω-1 pilot
 * honestly before executing it.
 *
 * Uso: npx tsx scripts/merge-pair-store-check.ts
 */
import { getServiceClient } from "./lib/client";
import { SupabaseMergeCandidateRepository, MergeAuditService } from "../src/domains/canonical-catalog";

async function storesFor(supabase: ReturnType<typeof getServiceClient>, canonicalProductId: string): Promise<Set<string>> {
  const { data } = await supabase.from("offers").select("store_id").eq("canonical_product_id", canonicalProductId);
  return new Set((data ?? []).map((r) => r.store_id as string));
}

async function main() {
  const supabase = getServiceClient();
  const repo = new SupabaseMergeCandidateRepository(supabase);
  const service = new MergeAuditService(repo);
  const audit = await service.classifyPending();

  let intraStore = 0;
  let crossStore = 0;

  for (const c of audit.alta) {
    const [sourceStores, targetStores] = await Promise.all([
      storesFor(supabase, c.sourceCanonicalProductId),
      storesFor(supabase, c.targetCanonicalProductId),
    ]);
    // Explicit rule: cross-store if source and target don't share exactly
    // the same store set — merging them is what actually moves Comparable
    // Product Coverage. Same store set = pure catalog-duplicate cleanup.
    const sameStores = sourceStores.size === targetStores.size && [...sourceStores].every((s) => targetStores.has(s));
    if (sameStores) intraStore++;
    else crossStore++;
    console.log(
      `${c.id.slice(0, 8)} | source stores: [${[...sourceStores].join(",")}] | target stores: [${[...targetStores].join(",")}] | ${sameStores ? "INTRA-STORE" : "CROSS-STORE"}`
    );
  }

  console.log(`\nTotal alta: ${audit.alta.length} | intra-store: ${intraStore} | cross-store: ${crossStore}`);
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
