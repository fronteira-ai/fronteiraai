/**
 * PROGRAM Κ — MISSION Κ-2 — Objetivo 5 grounding. Read-only.
 *
 * Samples real product names for a few high-volume brands to find genuine
 * model-string variance (the raw material Model Normalization needs) —
 * grounds the dictionary in real catalog text instead of the mission
 * brief's illustrative iPhone example.
 *
 * Uso: npx tsx scripts/kappa2-model-variance-sample.ts
 */
import { getServiceClient } from "./lib/client";

async function main() {
  const supabase = getServiceClient();

  const { data: brands } = await supabase.from("brands").select("id, name, slug");
  const { data: canonical } = await supabase.from("canonical_products").select("brand_id, name");

  const countByBrand = new Map<string, number>();
  for (const c of canonical ?? []) {
    if (!c.brand_id) continue;
    countByBrand.set(c.brand_id, (countByBrand.get(c.brand_id) ?? 0) + 1);
  }
  const topBrands = [...countByBrand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  MISSION Κ-2 — Model Variance Sample                      ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  for (const [brandId, count] of topBrands) {
    const brand = (brands ?? []).find((b) => b.id === brandId);
    console.log(`\n— ${brand?.name ?? brandId} (${count} produtos) — amostra de nomes —`);
    const names = (canonical ?? []).filter((c) => c.brand_id === brandId).slice(0, 12);
    for (const n of names) console.log(`  ${n.name}`);
  }

  console.log("\n[kappa2-model-variance-sample] done.");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
