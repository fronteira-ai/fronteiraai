/**
 * Catalog Integrity Firewall — Validação Final (Mission Ω-Gatekeeper).
 *
 * Read-only against products/offers/brands/categories (no writes to those
 * tables) — runs the REAL Gatekeeper (resolveBrand/resolveCategory) via the
 * real SupabaseCatalogRepository against the actual junk backlog measured
 * in Ω-Data (Shopping China's "Outros" brands, Mobile Zone's "GENERAL"
 * categories), to report real, honest numbers: how many would now resolve
 * automatically vs still require human review.
 *
 * Uso:
 *   npx tsx scripts/gatekeeper-validation-report.ts
 */

import { getServiceClient } from "./lib/client";
import { SupabaseCatalogRepository } from "../src/domains/connectors/infrastructure/SupabaseCatalogRepository";
import { resolveBrand, resolveCategory } from "../src/domains/connectors/normalization/BrandCategoryGatekeeper";
import type { GatekeeperDependencies } from "../src/domains/connectors/normalization/BrandCategoryGatekeeper";

const PAGE_SIZE = 1000;

async function fetchAll<T>(supabase: ReturnType<typeof getServiceClient>, table: string, select: string): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function main() {
  const supabase = getServiceClient();
  const catalogRepo = new SupabaseCatalogRepository(supabase);

  const deps: GatekeeperDependencies = {
    findBrandByNormalizedName: (n) => catalogRepo.findBrandByNormalizedName(n),
    findCategoryByNormalizedName: (n) => catalogRepo.findCategoryByNormalizedName(n),
    findBrandIdByIdentifier: (t, v) => catalogRepo.findBrandIdByIdentifier(t, v),
    findLearnedCorrection: async () => null, // no operator corrections exist yet — real, honest baseline
  };

  const { data: scStore } = await supabase.from("stores").select("id").eq("name", "Shopping China").single();
  const { data: mzStore } = await supabase.from("stores").select("id").eq("name", "Mobile Zone").single();
  const { data: junkBrandRow } = await supabase.from("brands").select("id").ilike("name", "outros").single();
  const { data: junkCategoryRow } = await supabase.from("categories").select("id").ilike("name", "GENERAL").single();

  const offers = await fetchAll<{ product_id: string; store_id: string }>(supabase, "offers", "product_id, store_id");
  const scProductIds = new Set(offers.filter((o) => o.store_id === scStore!.id).map((o) => o.product_id));
  const mzProductIds = new Set(offers.filter((o) => o.store_id === mzStore!.id).map((o) => o.product_id));

  console.log("=== SHOPPING CHINA — brand_id inválido ===");
  const scJunkWithBrand = await fetchAll<{ id: string; name: string; specifications: Record<string, string> | null; brand_id: string | null }>(
    supabase,
    "products",
    "id, name, specifications, brand_id"
  ).then((all) => all.filter((p) => scProductIds.has(p.id) && p.brand_id === junkBrandRow!.id));

  console.log(`Total produtos Shopping China com brand="Outros": ${scJunkWithBrand.length}`);

  let scAccepted = 0;
  let scPending = 0;
  const scLayerCounts = new Map<string, number>();
  const scPendingSample: string[] = [];

  for (const p of scJunkWithBrand) {
    const result = await resolveBrand(
      { rawBrandName: null, storeId: scStore!.id, productName: p.name, specifications: p.specifications },
      deps
    );
    if (result.decision === "accept") {
      scAccepted++;
      scLayerCounts.set(result.matchedLayer, (scLayerCounts.get(result.matchedLayer) ?? 0) + 1);
    } else {
      scPending++;
      if (scPendingSample.length < 10) scPendingSample.push(p.name);
    }
  }

  console.log(`Resolvidos automaticamente: ${scAccepted} (${((scAccepted / scJunkWithBrand.length) * 100).toFixed(1)}%)`);
  console.log("Por camada:", Object.fromEntries(scLayerCounts));
  console.log(`Ainda exigem revisão humana: ${scPending} (${((scPending / scJunkWithBrand.length) * 100).toFixed(1)}%)`);
  console.log("Amostra de pendentes:", scPendingSample);

  console.log("\n=== MOBILE ZONE — category_id inválido ===");
  const mzJunkWithCategory = await fetchAll<{ id: string; name: string; category_id: string | null }>(
    supabase,
    "products",
    "id, name, category_id"
  ).then((all) => all.filter((p) => mzProductIds.has(p.id) && p.category_id === junkCategoryRow!.id));

  console.log(`Total produtos Mobile Zone com category="GENERAL": ${mzJunkWithCategory.length}`);

  let mzAccepted = 0;
  let mzPending = 0;
  const mzLayerCounts = new Map<string, number>();
  const mzPendingSample: string[] = [];

  // Real category text isn't stored raw anywhere after write — the mapper
  // bug (product-mapper.ts) picked "GENERAL" specifically because it was
  // the LAST entry in productHasCategories, discarding the real one. This
  // validation reports what the Firewall does for the case AS RECORDED
  // (raw="GENERAL"), which is honestly always "pending_review" (GENERAL is
  // forbidden) — the real fix for these 2,139 products is the mapper bug
  // fix identified in Ω-Data, not the Firewall (the Firewall's job is to
  // stop NEW instances of this from becoming permanent, and it does: every
  // one of these would now be pending_review, never silently "GENERAL").
  for (const p of mzJunkWithCategory) {
    const result = await resolveCategory({ rawCategoryName: "GENERAL", storeId: mzStore!.id }, deps);
    if (result.decision === "accept") {
      mzAccepted++;
      mzLayerCounts.set(result.matchedLayer, (mzLayerCounts.get(result.matchedLayer) ?? 0) + 1);
    } else {
      mzPending++;
      if (mzPendingSample.length < 5) mzPendingSample.push(p.name);
    }
  }

  console.log(`Resolvidos automaticamente: ${mzAccepted} (${((mzAccepted / mzJunkWithCategory.length) * 100).toFixed(1)}%)`);
  console.log(`Ainda exigem revisão/correção de parser: ${mzPending} (${((mzPending / mzJunkWithCategory.length) * 100).toFixed(1)}%)`);
  console.log("Amostra:", mzPendingSample);

  console.log("\n=== RESUMO ===");
  console.log(`Redução esperada de brand_id inválido (Shopping China): ${scAccepted} de ${scJunkWithBrand.length} corrigidos automaticamente sem intervenção humana`);
  console.log(`category_id inválido (Mobile Zone): 0 corrigidos pelo Firewall sozinho — GENERAL é forbidden por definição; a correção real precisa do fix do bug de parser (Ω-Data) + Firewall bloqueando a permanência de futuros casos`);
}

main();
