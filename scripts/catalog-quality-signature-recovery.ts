/**
 * MISSION Ω-CATALOG QUALITY — supplementary read-only measurement.
 *
 * Measures what product-discovery-audit.ts did not: real ProductSignature
 * field-level extraction yield (via the unmodified buildProductSignature),
 * and current Catalog Recovery Engine coverage (candidates remaining vs.
 * decisions already made). 100% read-only.
 *
 * Uso:
 *   npx tsx scripts/catalog-quality-signature-recovery.ts
 */

import { getServiceClient } from "./lib/client";
import { buildProductSignature } from "@/src/domains/product-intelligence";

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
  console.log("MISSION Ω-CATALOG QUALITY — ProductSignature yield + Recovery coverage");
  console.log("=".repeat(80));

  // ── ProductSignature yield ──────────────────────────────────────────
  const products = await fetchAll<{ id: string; name: string; specifications: Record<string, string> | null; brand_id: string | null }>(
    async (from, to) => supabase.from("products").select("id, name, specifications, brand_id").range(from, to)
  );

  const fields = ["manufacturerCode", "model", "color", "capacityGb", "ramGb", "screenSizeIn", "processor", "gpu", "voltage", "powerW", "ean", "bundleIncludes"] as const;
  const counts: Record<string, number> = {};
  for (const f of fields) counts[f] = 0;
  let anyFieldCount = 0;

  for (const p of products) {
    const sig = buildProductSignature({ id: p.id, name: p.name, brandName: null, specifications: p.specifications });
    let any = false;
    for (const f of fields) {
      const val = (sig as unknown as Record<string, { value: unknown }>)[f]?.value;
      if (val !== null && val !== undefined) {
        counts[f]++;
        any = true;
      }
    }
    if (any) anyFieldCount++;
  }

  console.log(`\n### ProductSignature — cobertura real (${products.length} produtos) ###\n`);
  console.log(`Produtos com PELO MENOS 1 campo extraído: ${anyFieldCount} (${pct(anyFieldCount, products.length)})`);
  for (const f of fields) console.log(`  ${f}: ${counts[f]} (${pct(counts[f], products.length)})`);

  // ── Recovery Engine coverage ─────────────────────────────────────────
  console.log(`\n### Catalog Recovery Engine — cobertura atual ###\n`);
  const { data: junkBrandRow } = await supabase.from("brands").select("id").ilike("name", "outros").maybeSingle();
  const { count: totalProducts } = await supabase.from("products").select("*", { count: "exact", head: true });
  const junkBrandCount = junkBrandRow ? products.filter((p) => p.brand_id === junkBrandRow.id).length : 0;
  const { count: recoveryDecisions } = await supabase.from("catalog_recovery_decisions").select("*", { count: "exact", head: true });
  const { count: recoveryDecisionsBrand } = await supabase.from("catalog_recovery_decisions").select("*", { count: "exact", head: true }).eq("field_type", "brand");
  const { count: recoveryDecisionsCategory } = await supabase.from("catalog_recovery_decisions").select("*", { count: "exact", head: true }).eq("field_type", "category");

  console.log(`Produtos com brand="Outros" hoje: ${junkBrandCount} de ${totalProducts}`);
  console.log(`catalog_recovery_decisions total: ${recoveryDecisions} (brand: ${recoveryDecisionsBrand}, category: ${recoveryDecisionsCategory})`);
  console.log(`Cobertura do Recovery Engine sobre o backlog de marca "Outros": ${pct(recoveryDecisionsBrand ?? 0, junkBrandCount)} (decisões já tomadas / produtos ainda afetados hoje — nota: decisões passadas podem ter corrigido produtos que hoje já não estão mais "Outros", então este é um piso, não uma medida exata de sobreposição)`);

  console.log("\n" + "=".repeat(80));
  console.log("FIM — nenhuma escrita realizada.");
  console.log("=".repeat(80));
}

main().catch((err) => {
  console.error("[catalog-quality-signature-recovery] Fatal:", err);
  process.exit(1);
});
