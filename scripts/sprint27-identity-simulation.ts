/**
 * Sprint 2.7 — Product Identity Decision Audit. Read-only, single-run
 * investigation script. Not wired into package.json (one-off audit, same
 * pattern as product-comparison-audit.ts / sprint26-mergecandidate-breakdown.ts).
 *
 * Uses the REAL, UNMODIFIED ProductIdentityEngine.evaluate() — called once
 * per (source, single-candidate) pair instead of once per (source, all
 * candidates) — to reconstruct the FULL ranked candidate list that
 * CanonicalMergeSuggestionService.suggestMergesFor() collapses down to a
 * single winner. This reproduces exactly the production scoring formula,
 * just without throwing away the runner-ups.
 *
 * No writes. No merge_candidates created. No engine/service code touched.
 *
 * Modes:
 *   --mode=strategic   full exhaustive ranking for the 7 named product families
 *   --mode=marketplace full exhaustive ranking for every real brand (excludes
 *                      the "outros" catch-all bucket, which is sampled instead
 *                      — see console output for why)
 *
 * Uso:
 *   npx tsx scripts/sprint27-identity-simulation.ts --mode=strategic
 *   npx tsx scripts/sprint27-identity-simulation.ts --mode=marketplace
 */
import { getServiceClient } from "./lib/client";
import { ProductIdentityEngine } from "@/src/domains/product-identity/domain/ProductIdentityEngine";
import { CONFIDENCE_THRESHOLDS } from "@/src/domains/product-identity/types/enums";
import type { EvaluableProduct, MatchCandidate } from "@/src/domains/product-identity/types/product-identity.types";

const MODE = (process.argv.find((a) => a.startsWith("--mode="))?.split("=")[1] ?? "strategic") as
  | "strategic"
  | "marketplace";
const OUTROS_SAMPLE_SIZE = 500;

interface CanonicalRow {
  id: string;
  canonical_slug: string;
  name: string;
  brand_id: string | null;
  category_id: string | null;
  specifications: Record<string, string> | null;
}

const engine = new ProductIdentityEngine();

function toEvaluable(c: CanonicalRow): EvaluableProduct {
  return {
    slug: c.canonical_slug,
    name: c.name,
    brandSlug: c.brand_id ?? "",
    categorySlug: c.category_id ?? "",
    specifications: c.specifications ?? {},
  };
}
function toCandidate(c: CanonicalRow): MatchCandidate {
  return {
    productId: c.id,
    slug: c.canonical_slug,
    name: c.name,
    brandSlug: c.brand_id ?? "",
    categorySlug: c.category_id ?? "",
    specifications: c.specifications ?? {},
  };
}

interface RankedPair {
  candidateId: string;
  candidateName: string;
  confidence: number;
  tier: string;
  matched: string[];
  mismatched: string[];
  crossMerchant: boolean;
  sourceStores: string[];
  candidateStores: string[];
}

// Full ranking for one source against its brand cohort — same scoring the
// production engine uses (one real evaluate() call per pair), just kept
// instead of discarded.
function rankAllCandidates(
  source: CanonicalRow,
  cohort: CanonicalRow[],
  storesByCanonical: Map<string, Set<string>>
): RankedPair[] {
  const sourceEval = toEvaluable(source);
  const sourceStores = [...(storesByCanonical.get(source.id) ?? [])];
  const ranked: RankedPair[] = [];
  for (const cand of cohort) {
    if (cand.id === source.id) continue;
    const result = engine.evaluate(sourceEval, [toCandidate(cand)]);
    const candidateStores = [...(storesByCanonical.get(cand.id) ?? [])];
    const union = new Set([...sourceStores, ...candidateStores]);
    ranked.push({
      candidateId: cand.id,
      candidateName: cand.name,
      confidence: result.confidence,
      tier: result.tier,
      matched: result.matchedAttributes,
      mismatched: result.mismatchedAttributes,
      crossMerchant: union.size >= 2,
      sourceStores,
      candidateStores,
    });
  }
  ranked.sort((a, b) => b.confidence - a.confidence);
  return ranked;
}

// Scenario simulation over one source's already-ranked candidate list.
function simulateScenarios(ranked: RankedPair[], topN: number) {
  const aboveThreshold = ranked.filter((r) => r.confidence >= CONFIDENCE_THRESHOLDS.possible);

  const A = ranked.length > 0 && ranked[0].confidence >= CONFIDENCE_THRESHOLDS.possible ? [ranked[0]] : [];

  const bestCross = aboveThreshold.find((r) => r.crossMerchant);
  const bestIntra = aboveThreshold.find((r) => !r.crossMerchant);
  const bSet = new Set<RankedPair>();
  if (bestIntra) bSet.add(bestIntra);
  if (bestCross) bSet.add(bestCross);
  const B = [...bSet];

  const C = aboveThreshold.slice(0, topN);

  const D = aboveThreshold;

  return { A, B, C, D, aboveThreshold };
}

async function loadCanonicalProducts(supabase: ReturnType<typeof getServiceClient>): Promise<CanonicalRow[]> {
  const rows: CanonicalRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("canonical_products")
      .select("id, canonical_slug, name, brand_id, category_id, specifications")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...(data as CanonicalRow[]));
    if (data.length < 1000) break;
  }
  return rows;
}

async function loadStoresByCanonical(supabase: ReturnType<typeof getServiceClient>): Promise<Map<string, Set<string>>> {
  const { data: stores } = await supabase.from("stores").select("id, slug");
  const storeById = new Map((stores ?? []).map((s) => [s.id as string, s.slug as string]));

  const map = new Map<string, Set<string>>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("offers")
      .select("canonical_product_id, store_id")
      .not("canonical_product_id", "is", null)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const o of data) {
      const cid = o.canonical_product_id as string;
      const slug = storeById.get(o.store_id as string) ?? (o.store_id as string);
      if (!map.has(cid)) map.set(cid, new Set());
      map.get(cid)!.add(slug);
    }
    if (data.length < 1000) break;
  }
  return map;
}

const STRATEGIC_FAMILIES: { label: string; pattern: RegExp }[] = [
  { label: "iPhone", pattern: /iphone/i },
  { label: "Samsung Galaxy", pattern: /galaxy/i },
  { label: "MacBook", pattern: /macbook/i },
  { label: "AirPods", pattern: /airpods/i },
  { label: "Apple Watch", pattern: /apple\s*watch/i },
  { label: "PlayStation", pattern: /play\s*station|ps5|ps4/i },
  { label: "Nintendo Switch", pattern: /nintendo|switch/i },
];

function summarizeGroup(
  label: string,
  sources: CanonicalRow[],
  cohortByBrand: Map<string, CanonicalRow[]>,
  storesByCanonical: Map<string, Set<string>>,
  verbose: boolean
) {
  if (verbose) {
    console.log(`\n\n═══════════════════════════════════════════════════════════`);
    console.log(`FAMÍLIA: ${label} — ${sources.length} canonical product(s) fonte`);
    console.log(`═══════════════════════════════════════════════════════════`);
  }

  let totalEvaluated = 0;
  let totalIntra = 0;
  let totalCross = 0;
  let aCount = 0;
  let bCount = 0;
  let cCount = 0;
  let dCount = 0;
  let aCross = 0;
  let bCross = 0;
  let cCross = 0;
  let dCross = 0;
  // Root-cause attribution for cross-merchant pairs specifically.
  let crossCategoryGateFailed = 0; // category mismatched -> capped at MISMATCH_CAP(40), can never reach 70
  let crossGatePassedBelowThreshold = 0; // category matched, gate open, still < 70 (name/spec driven)
  let crossAboveThreshold = 0;
  let maxCrossConfidence = 0;
  let maxCrossExample = "";

  for (const source of sources) {
    const cohort = source.brand_id ? cohortByBrand.get(source.brand_id) ?? [] : [];
    if (cohort.length <= 1) continue;
    const ranked = rankAllCandidates(source, cohort, storesByCanonical);
    totalEvaluated += ranked.length;
    totalIntra += ranked.filter((r) => !r.crossMerchant).length;
    totalCross += ranked.filter((r) => r.crossMerchant).length;

    for (const r of ranked) {
      if (!r.crossMerchant) continue;
      if (r.mismatched.includes("category")) crossCategoryGateFailed++;
      else if (r.confidence >= CONFIDENCE_THRESHOLDS.possible) crossAboveThreshold++;
      else crossGatePassedBelowThreshold++;
      if (r.confidence > maxCrossConfidence) {
        maxCrossConfidence = r.confidence;
        maxCrossExample = `"${source.name}" vs "${r.candidateName}" (conf=${r.confidence}, matched=[${r.matched.join(",")}])`;
      }
    }

    const { A, B, C, D, aboveThreshold } = simulateScenarios(ranked, 3);
    aCount += A.length;
    bCount += B.length;
    cCount += C.length;
    dCount += D.length;
    aCross += A.filter((r) => r.crossMerchant).length;
    bCross += B.filter((r) => r.crossMerchant).length;
    cCross += C.filter((r) => r.crossMerchant).length;
    dCross += D.filter((r) => r.crossMerchant).length;

    if (verbose) {
      console.log(`\n· "${source.name}" (${source.canonical_slug}) [lojas: ${[...(storesByCanonical.get(source.id) ?? [])].join(",") || "nenhuma"}]`);
      console.log(`    candidatos avaliados: ${ranked.length} (intra-loja: ${ranked.filter((r) => !r.crossMerchant).length}, cross-merchant: ${ranked.filter((r) => r.crossMerchant).length})`);
      console.log(`    acima do threshold (${CONFIDENCE_THRESHOLDS.possible}): ${aboveThreshold.length}`);
      for (const r of ranked.slice(0, 8)) {
        console.log(
          `      conf=${r.confidence} tier=${r.tier} ${r.crossMerchant ? "CROSS" : "intra"} lojas=[${r.candidateStores.join(",")}] "${r.candidateName}" (matched=[${r.matched.join(",")}] mismatched=[${r.mismatched.join(",")}])`
        );
      }
      if (ranked.length > 8) console.log(`      ... +${ranked.length - 8} candidato(s) não exibido(s)`);
    }
  }

  console.log(`\n  ── Resumo "${label}" ──`);
  console.log(`  Total pares avaliados: ${totalEvaluated} (intra=${totalIntra}, cross=${totalCross})`);
  console.log(`  Cross-merchant: gate categoria falhou (cap 40)=${crossCategoryGateFailed}, gate passou mas <70=${crossGatePassedBelowThreshold}, acima threshold=${crossAboveThreshold}`);
  console.log(`  Maior confiança cross-merchant observada: ${maxCrossConfidence} ${maxCrossExample ? `(${maxCrossExample})` : ""}`);
  console.log(`  Cenário A (best-only):        candidatos persistidos=${aCount} cross=${aCross}`);
  console.log(`  Cenário B (best intra + best cross): candidatos persistidos=${bCount} cross=${bCross}`);
  console.log(`  Cenário C (top-3 >= threshold): candidatos persistidos=${cCount} cross=${cCross}`);
  console.log(`  Cenário D (todos >= threshold): candidatos persistidos=${dCount} cross=${dCross}`);

  return {
    totalEvaluated,
    totalIntra,
    totalCross,
    aCount,
    bCount,
    cCount,
    dCount,
    aCross,
    bCross,
    cCross,
    dCross,
    crossCategoryGateFailed,
    crossGatePassedBelowThreshold,
    crossAboveThreshold,
    maxCrossConfidence,
  };
}

async function main() {
  const supabase = getServiceClient();
  console.log(`\n[sprint27-identity-simulation] mode=${MODE}\n`);

  const canonical = await loadCanonicalProducts(supabase);
  const storesByCanonical = await loadStoresByCanonical(supabase);
  console.log(`Loaded ${canonical.length} canonical_products, store-map for ${storesByCanonical.size} of them.`);

  const cohortByBrand = new Map<string, CanonicalRow[]>();
  for (const c of canonical) {
    if (!c.brand_id) continue;
    if (!cohortByBrand.has(c.brand_id)) cohortByBrand.set(c.brand_id, []);
    cohortByBrand.get(c.brand_id)!.push(c);
  }

  const { data: brandRows } = await supabase.from("brands").select("id, slug, name");
  const outrosBrand = (brandRows ?? []).find((b) => (b.slug as string) === "outros");

  if (MODE === "strategic") {
    const totals = {
      totalEvaluated: 0, totalIntra: 0, totalCross: 0,
      aCount: 0, bCount: 0, cCount: 0, dCount: 0,
      aCross: 0, bCross: 0, cCross: 0, dCross: 0,
      crossCategoryGateFailed: 0, crossGatePassedBelowThreshold: 0, crossAboveThreshold: 0, maxCrossConfidence: 0,
    };
    for (const family of STRATEGIC_FAMILIES) {
      const sources = canonical.filter((c) => family.pattern.test(c.name));
      const r = summarizeGroup(family.label, sources, cohortByBrand, storesByCanonical, true);
      for (const k of Object.keys(totals) as (keyof typeof totals)[]) {
        totals[k] = k === "maxCrossConfidence" ? Math.max(totals[k], r[k]) : totals[k] + r[k];
      }
    }
    console.log(`\n\n╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  TOTAL AMOSTRA ESTRATÉGICA (7 famílias)                    ║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝`);
    console.log(totals);
  }

  if (MODE === "marketplace") {
    const grandTotals = {
      totalEvaluated: 0, totalIntra: 0, totalCross: 0,
      aCount: 0, bCount: 0, cCount: 0, dCount: 0,
      aCross: 0, bCross: 0, cCross: 0, dCross: 0,
      crossCategoryGateFailed: 0, crossGatePassedBelowThreshold: 0, crossAboveThreshold: 0, maxCrossConfidence: 0,
    };

    console.log(`\n\n── Brands reais (excluindo "outros") ──`);
    let brandsProcessed = 0;
    for (const [brandId, cohort] of cohortByBrand.entries()) {
      if (outrosBrand && brandId === outrosBrand.id) continue;
      if (cohort.length < 2) continue;
      const brand = (brandRows ?? []).find((b) => b.id === brandId);
      const r = summarizeGroup(`brand=${brand?.name ?? brandId}`, cohort, cohortByBrand, storesByCanonical, false);
      for (const k of Object.keys(grandTotals) as (keyof typeof grandTotals)[]) {
        grandTotals[k] = k === "maxCrossConfidence" ? Math.max(grandTotals[k], r[k]) : grandTotals[k] + r[k];
      }
      brandsProcessed++;
    }
    console.log(`\nBrands reais processados: ${brandsProcessed}`);

    if (outrosBrand) {
      console.log(`\n\n── "Outros" (bucket catch-all) — amostra de ${OUTROS_SAMPLE_SIZE} fontes contra todo o cohort ──`);
      const outrosCohort = cohortByBrand.get(outrosBrand.id) ?? [];
      const shuffled = [...outrosCohort].sort(() => Math.random() - 0.5);
      const sample = shuffled.slice(0, OUTROS_SAMPLE_SIZE);
      const r = summarizeGroup(`outros (amostra ${sample.length}/${outrosCohort.length})`, sample, cohortByBrand, storesByCanonical, false);
      // Scale sampled totals to the full "outros" population for the grand total estimate.
      // NOTE: maxCrossConfidence is not scaled (it's a max, not a sum) — merged directly.
      const scale = outrosCohort.length / Math.max(1, sample.length);
      console.log(`\n  Fator de escala para extrapolar "outros" completo: ${scale.toFixed(2)}x`);
      for (const k of Object.keys(grandTotals) as (keyof typeof grandTotals)[]) {
        if (k === "maxCrossConfidence") grandTotals[k] = Math.max(grandTotals[k], r[k]);
        else grandTotals[k] += Math.round(r[k] * scale);
      }
    }

    console.log(`\n\n╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  TOTAL MARKETPLACE (brands reais exaustivo + outros escalado) ║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝`);
    console.log(grandTotals);
  }

  console.log(`\n[sprint27-identity-simulation] done. mode=${MODE}`);
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
