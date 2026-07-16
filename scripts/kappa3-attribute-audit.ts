/**
 * PROGRAM Κ — MISSION Κ-3 — Objetivo 1: Auditoria completa dos atributos.
 *
 * Read-only. Measures, against real production data:
 *   - Quais chaves aparecem em canonical_products.specifications hoje
 *   - Frequência de cada chave
 *   - Quantos canonical_products têm specifications vazio/não-vazio
 *   - Amostra de valores por chave (para julgar "qualidade"/consistência)
 *
 * Uso: npx tsx scripts/kappa3-attribute-audit.ts
 */
import { getServiceClient } from "./lib/client";

const PAGE_SIZE = 1000;

interface CanonicalRow {
  id: string;
  name: string;
  specifications: Record<string, string> | null;
}

async function fetchAll(supabase: ReturnType<typeof getServiceClient>): Promise<CanonicalRow[]> {
  const rows: CanonicalRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from("canonical_products").select("id, name, specifications").range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...(data as CanonicalRow[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function main() {
  const supabase = getServiceClient();
  const rows = await fetchAll(supabase);

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  MISSION Κ-3 — Objetivo 1: Attribute Audit                 ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  console.log(`canonical_products totais: ${rows.length}`);

  let emptySpec = 0;
  const keyCounts = new Map<string, number>();
  const keySamples = new Map<string, string[]>();

  for (const r of rows) {
    const spec = r.specifications ?? {};
    const keys = Object.keys(spec);
    if (keys.length === 0) {
      emptySpec++;
      continue;
    }
    for (const k of keys) {
      keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1);
      if (!keySamples.has(k)) keySamples.set(k, []);
      const samples = keySamples.get(k)!;
      if (samples.length < 6 && spec[k]) samples.push(String(spec[k]));
    }
  }

  console.log(`specifications vazio: ${emptySpec} (${((emptySpec / rows.length) * 100).toFixed(1)}%)`);
  console.log(`specifications não-vazio: ${rows.length - emptySpec} (${(((rows.length - emptySpec) / rows.length) * 100).toFixed(1)}%)`);

  console.log(`\n— Ranking de chaves por frequência (${keyCounts.size} chaves distintas) —`);
  const ranked = [...keyCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [key, count] of ranked) {
    const samples = keySamples.get(key) ?? [];
    console.log(`  ${key}: ${count} (${((count / rows.length) * 100).toFixed(2)}%) — ex: ${samples.join(" | ")}`);
  }

  console.log("\n[kappa3-attribute-audit] done.");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
