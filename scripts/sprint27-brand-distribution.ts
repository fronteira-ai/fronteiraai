/**
 * Sprint 2.7 — Objetivo 2/3 feasibility probe. Read-only.
 *
 * Groups canonical_products by brand_id to size the pairwise-evaluation cost
 * (sum of size(brand)^2) before deciding how much of the marketplace can be
 * exhaustively simulated vs. sampled. No writes.
 *
 * Uso: npx tsx scripts/sprint27-brand-distribution.ts
 */
import { getServiceClient } from "./lib/client";

async function main() {
  const supabase = getServiceClient();

  const canonical: { id: string; brand_id: string | null; category_id: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("canonical_products")
      .select("id, brand_id, category_id")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    canonical.push(...(data as typeof canonical));
    if (data.length < 1000) break;
  }

  const { data: brands } = await supabase.from("brands").select("id, slug, name");
  const brandById = new Map((brands ?? []).map((b) => [b.id as string, b]));

  const byBrand = new Map<string, number>();
  let noBrand = 0;
  for (const c of canonical) {
    if (!c.brand_id) {
      noBrand++;
      continue;
    }
    byBrand.set(c.brand_id, (byBrand.get(c.brand_id) ?? 0) + 1);
  }

  const sorted = [...byBrand.entries()].sort((a, b) => b[1] - a[1]);
  let totalPairs = 0;
  for (const [, size] of sorted) totalPairs += size * (size - 1);

  console.log(`Total canonical_products: ${canonical.length}`);
  console.log(`Sem brand_id: ${noBrand}`);
  console.log(`Brands distintos com >=1 produto: ${byBrand.size}`);
  console.log(`Brands com >=2 produtos (elegíveis a par): ${sorted.filter(([, s]) => s >= 2).length}`);
  console.log(`Total de pares direcionais (source->candidate) se 100% exaustivo: ${totalPairs.toLocaleString()}`);
  console.log(`\nTop 30 brands por tamanho:`);
  for (const [brandId, size] of sorted.slice(0, 30)) {
    const b = brandById.get(brandId);
    console.log(`  ${b?.name ?? brandId} (${b?.slug ?? "?"}): ${size} produtos -> ${(size * (size - 1)).toLocaleString()} pares direcionais`);
  }
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
