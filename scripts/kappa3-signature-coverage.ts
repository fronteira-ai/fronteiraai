/**
 * PROGRAM Κ — MISSION Κ-3 — Objetivo 1 (extensão)/3: cobertura real do
 * Product Signature. Read-only.
 *
 * Uso: npx tsx scripts/kappa3-signature-coverage.ts
 */
import { getServiceClient } from "./lib/client";
import { buildProductSignature } from "../src/domains/product-intelligence";

const PAGE_SIZE = 1000;

interface CanonicalRow {
  id: string;
  name: string;
  brand_id: string | null;
  specifications: Record<string, string> | null;
}

async function fetchAll(supabase: ReturnType<typeof getServiceClient>): Promise<CanonicalRow[]> {
  const rows: CanonicalRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from("canonical_products").select("id, name, brand_id, specifications").range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...(data as CanonicalRow[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function main() {
  const supabase = getServiceClient();
  const [rows, brands] = await Promise.all([fetchAll(supabase), supabase.from("brands").select("id, name").then((r) => r.data ?? [])]);
  const brandNameById = new Map((brands as { id: string; name: string }[]).map((b) => [b.id, b.name]));

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  MISSION Κ-3 — Product Signature Coverage                  ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  console.log(`canonical_products totais: ${rows.length}`);

  const fields: (keyof ReturnType<typeof buildProductSignature>)[] = [
    "brand",
    "model",
    "color",
    "capacityGb",
    "ramGb",
    "screenSizeIn",
    "processor",
    "gpu",
    "voltage",
    "powerW",
    "ean",
    "manufacturerCode",
    "bundleIncludes",
  ];
  const counts = new Map<string, number>(fields.map((f) => [f, 0]));

  for (const r of rows) {
    const sig = buildProductSignature({
      id: r.id,
      name: r.name,
      brandName: r.brand_id ? brandNameById.get(r.brand_id) ?? null : null,
      specifications: r.specifications,
    });
    for (const f of fields) {
      const attr = sig[f] as { value: unknown };
      if (attr.value !== null && attr.value !== undefined) counts.set(f, (counts.get(f) ?? 0) + 1);
    }
  }

  console.log("\n— Cobertura por campo (Objetivo 3) —");
  for (const f of fields) {
    const c = counts.get(f) ?? 0;
    console.log(`  ${f}: ${c} (${((c / rows.length) * 100).toFixed(2)}%)`);
  }

  console.log("\n[kappa3-signature-coverage] done.");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
