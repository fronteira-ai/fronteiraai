/**
 * PROGRAM Κ — MISSION Κ-2 — Objetivo 7/8: Cross-Merchant Simulation.
 *
 * Read-only, in-memory only — zero escrita em canonical_products/offers,
 * zero alteração de ProductIdentityEngine/CanonicalMergeSuggestionService/
 * Merge Engine (mandato: "não altera Product Identity", "não altera o
 * Merge Engine"). Reaproveita literalmente o método de
 * scripts/kappa1-impact-simulation.ts (que por sua vez reaproveita
 * scripts/sprint27-identity-simulation.ts): o ProductIdentityEngine.evaluate()
 * real, chamado par a par dentro do cohort de marca, marketplace inteiro.
 *
 * 3 cenários, não 2 — a novidade desta Mission sobre a Κ-1:
 *   BASELINE   — category_id e brand_id reais, sem nenhuma normalização.
 *   CATEGORIA  — category_id remapeado pelos 66 clusters já validados
 *                (idêntico ao TREATMENT da Κ-1 — reproduz o resultado
 *                publicado como verificação de sanidade).
 *   CATEGORIA+MARCA — CATEGORIA acima, mais brand_id remapeado pelos 2
 *                grupos de duplicata de marca reais medidos
 *                (scripts/kappa2-taxonomy-audit.ts).
 *
 * Uso: npx tsx scripts/kappa2-cross-merchant-simulation.ts
 */
import { getServiceClient } from "./lib/client";
import { ProductIdentityEngine } from "@/src/domains/product-identity/domain/ProductIdentityEngine";
import { CONFIDENCE_THRESHOLDS } from "@/src/domains/product-identity/types/enums";
import type { EvaluableProduct, MatchCandidate } from "@/src/domains/product-identity/types/product-identity.types";
import { normalizeBrandName } from "@/src/domains/taxonomy";

const OUTROS_SAMPLE_SIZE = 500;

// Identical to scripts/kappa1-impact-simulation.ts's VALIDATED_CLUSTERS —
// duplicated deliberately (that script is not altered, per the Quality
// Gate) rather than imported, since it has no exported members (a
// standalone `main()`). Kept in exact sync with
// docs/product/CATEGORY_CLUSTER_MATRIX.md §2.
const VALIDATED_CLUSTERS: string[][] = [
  ["celulares", "smartphones", "celular", "celulares-e-smartphones"],
  ["fone-de-ouvido-sem-fio", "fone-de-ouvido-com-fio", "fones-de-ouvido"],
  ["perfumes", "perfume"],
  ["smartwatch", "smartwatches"],
  ["speaker", "speakers", "parlantes"],
  ["carregadores", "cargadores"],
  ["tablet", "tablets"],
  ["tvs", "televisor", "televisores"],
  ["teclado", "teclados"],
  ["monitor", "monitores"],
  ["accesorios-para-celulares", "accesorio-para-celulares"],
  ["cosmetico", "cosmeticos"],
  ["mouses", "mouse"],
  ["impressoras", "impresoras"],
  ["colonia-body-splash", "body-splash"],
  ["aspiradores", "aspirador", "aspiradora"],
  ["auriculares", "headsets", "headset"],
  ["memoria-ram", "memoria-ram-para-notebook", "memoria-ram-para-pc"],
  ["jogos", "juegos", "games"],
  ["pendrive", "pendrives"],
  ["cuidado-personal", "cuidados-personales"],
  ["cameras-fotograficas", "camaras-fotograficas"],
  ["cameras", "camaras"],
  ["controles", "controle"],
  ["cafeteira", "cafetera"],
  ["caixa-de-som", "caixas-de-som"],
  ["bolsas-y-mochilas", "mochilas-y-bolsas"],
  ["microfone", "microfones", "microfono", "microfonos"],
  ["roteador", "router"],
  ["cartao-de-memoria-e-sd", "cartoes-de-memoria", "tarjeta-de-memoria"],
  ["pilhas-e-carregadores", "pilhasbaterias-carregadores"],
  ["kit-mouse-y-teclado", "teclados-mouses"],
  ["gabinetes", "gabinete"],
  ["accesorios-para-notebook", "accesorios-p-notebook"],
  ["placas-de-video", "placa-de-video"],
  ["patinetes", "patineta", "patinete"],
  ["adaptador-wi-fi-e-bluetooth", "dongle-adaptador-wi-fi"],
  ["sanduicheira", "sandwichera"],
  ["masajeadores", "massageadores"],
  ["upsnobreak", "ups-nobreaks"],
  ["radios-portatiles", "radio-portatil"],
  ["cartuchos-tintas-e-toners", "tinta-cartucho-e-toner"],
  ["wafleira", "waflera"],
  ["reloj-masculino", "relojes-masculinos"],
  ["almacenamiento", "almacenamientos"],
  ["video-game-retro", "video-games"],
  ["panelas", "panela"],
  ["mochilas-maletas-e-capas", "maletasmochilascapas"],
  ["scooters", "scooter"],
  ["ferramentas", "herramientas", "ferramenta"],
  ["webcams", "webcam"],
  ["impressoras-3d", "impresoras-3d"],
  ["mousepads", "mousepad"],
  ["subwoofers", "subwoofer"],
  ["desodorante", "desodorantes"],
  ["carregador-veicular", "carregador-veicular-usb"],
  ["home-theater-e-soundbar", "home-theaters"],
  ["espremedor-e-extrator-de-suco", "extrator-de-suco"],
  ["lampara", "lampada"],
  ["estufa", "estufas"],
  ["nobreaks-e-estabilizadores", "nobreak-estabilizador"],
];

interface CanonicalRow {
  id: string;
  canonical_slug: string;
  name: string;
  brand_id: string | null;
  category_id: string | null;
  specifications: Record<string, string> | null;
}

const engine = new ProductIdentityEngine();

function toEvaluable(c: CanonicalRow, categoryOf: (id: string | null) => string, brandOf: (id: string | null) => string): EvaluableProduct {
  return { slug: c.canonical_slug, name: c.name, brandSlug: brandOf(c.brand_id), categorySlug: categoryOf(c.category_id), specifications: c.specifications ?? {} };
}
function toCandidate(c: CanonicalRow, categoryOf: (id: string | null) => string, brandOf: (id: string | null) => string): MatchCandidate {
  return { productId: c.id, slug: c.canonical_slug, name: c.name, brandSlug: brandOf(c.brand_id), categorySlug: categoryOf(c.category_id), specifications: c.specifications ?? {} };
}

interface RunTotals {
  totalCross: number;
  crossCategoryGateFailed: number;
  crossGatePassedBelowThreshold: number;
  crossAlta: number; // >=95
  crossMedia: number; // 85-94
  crossManual: number; // 70-84
  aboveThresholdExamples: string[];
  persistedBestPairs: Set<string>; // canonical product ids that would get a new best cross-merchant candidate >=70
}

function newTotals(): RunTotals {
  return {
    totalCross: 0,
    crossCategoryGateFailed: 0,
    crossGatePassedBelowThreshold: 0,
    crossAlta: 0,
    crossMedia: 0,
    crossManual: 0,
    aboveThresholdExamples: [],
    persistedBestPairs: new Set(),
  };
}

function evaluateGroup(
  cohort: CanonicalRow[],
  storesByCanonical: Map<string, Set<string>>,
  categoryOf: (id: string | null) => string,
  brandOf: (id: string | null) => string,
  totals: RunTotals
) {
  for (const source of cohort) {
    if (cohort.length <= 1) continue;
    const sourceEval = toEvaluable(source, categoryOf, brandOf);
    const sourceStores = storesByCanonical.get(source.id) ?? new Set<string>();
    // Bug found and fixed during verification (2026-07-15): this must only
    // track confidence among CROSS-merchant candidates — tracking it before
    // the crossMerchant filter silently let a same-store best confidence
    // count toward "produtos com um novo candidato cross-merchant", which
    // contradicts the label and inflates the number with intra-store noise.
    let bestCrossConfidence = -1;

    for (const cand of cohort) {
      if (cand.id === source.id) continue;
      const result = engine.evaluate(sourceEval, [toCandidate(cand, categoryOf, brandOf)]);
      const candStores = storesByCanonical.get(cand.id) ?? new Set<string>();
      const union = new Set([...sourceStores, ...candStores]);
      const crossMerchant = union.size >= 2;
      if (!crossMerchant) continue;
      if (result.confidence > bestCrossConfidence) bestCrossConfidence = result.confidence;

      totals.totalCross++;
      if (result.mismatchedAttributes.includes("category") || result.mismatchedAttributes.includes("brand")) {
        totals.crossCategoryGateFailed++;
      } else if (result.confidence >= CONFIDENCE_THRESHOLDS.auto) {
        totals.crossAlta++;
        totals.aboveThresholdExamples.push(`ALTA "${source.name}" vs "${cand.name}" (conf=${result.confidence})`);
      } else if (result.confidence >= CONFIDENCE_THRESHOLDS.probable) {
        totals.crossMedia++;
        totals.aboveThresholdExamples.push(`MEDIA "${source.name}" vs "${cand.name}" (conf=${result.confidence})`);
      } else if (result.confidence >= CONFIDENCE_THRESHOLDS.possible) {
        totals.crossManual++;
        totals.aboveThresholdExamples.push(`MANUAL "${source.name}" vs "${cand.name}" (conf=${result.confidence})`);
      } else {
        totals.crossGatePassedBelowThreshold++;
      }
    }
    if (bestCrossConfidence >= CONFIDENCE_THRESHOLDS.possible) totals.persistedBestPairs.add(source.id);
  }
}

async function loadCanonicalProducts(supabase: ReturnType<typeof getServiceClient>): Promise<CanonicalRow[]> {
  const rows: CanonicalRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("canonical_products").select("id, canonical_slug, name, brand_id, category_id, specifications").range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...(data as CanonicalRow[]));
    if (data.length < 1000) break;
  }
  return rows;
}

async function loadStoresByCanonical(supabase: ReturnType<typeof getServiceClient>): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("offers").select("canonical_product_id, store_id").not("canonical_product_id", "is", null).range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const o of data) {
      const cid = o.canonical_product_id as string;
      if (!map.has(cid)) map.set(cid, new Set());
      map.get(cid)!.add(o.store_id as string);
    }
    if (data.length < 1000) break;
  }
  return map;
}

async function main() {
  const supabase = getServiceClient();
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  MISSION Κ-2 — Objetivo 7/8: Cross-Merchant Simulation     ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const [canonical, categories, brands, storesByCanonical] = await Promise.all([
    loadCanonicalProducts(supabase),
    supabase.from("categories").select("id, slug").then((r) => r.data ?? []),
    supabase.from("brands").select("id, name, slug").then((r) => r.data ?? []),
    loadStoresByCanonical(supabase),
  ]);

  const categoryIdBySlug = new Map((categories as { id: string; slug: string }[]).map((c) => [c.slug, c.id]));
  const categoryIdToClusterId = new Map<string, string>();
  for (const group of VALIDATED_CLUSTERS) {
    const ids = group.map((slug) => categoryIdBySlug.get(slug)).filter((id): id is string => !!id);
    if (ids.length < 2) continue;
    for (const id of ids) categoryIdToClusterId.set(id, ids[0]);
  }

  // Brand normalization: group real brand ids by normalizeBrandName(), same
  // function that scripts/kappa2-taxonomy-audit.ts already ran against
  // production (found 2 real groups) — reused here unmodified from
  // src/domains/taxonomy/, not re-derived.
  const brandIdToCanonicalId = new Map<string, string>();
  const byNormalizedName = new Map<string, string>();
  for (const b of brands as { id: string; name: string }[]) {
    const norm = normalizeBrandName(b.name);
    const existing = byNormalizedName.get(norm);
    if (existing) brandIdToCanonicalId.set(b.id, existing);
    else byNormalizedName.set(norm, b.id);
  }

  const baselineCategoryOf = (id: string | null) => id ?? "";
  const clusteredCategoryOf = (id: string | null) => (id ? categoryIdToClusterId.get(id) ?? id : "");
  const baselineBrandOf = (id: string | null) => id ?? "";
  const normalizedBrandOf = (id: string | null) => (id ? brandIdToCanonicalId.get(id) ?? id : "");

  const cohortByBrand = new Map<string, CanonicalRow[]>();
  for (const c of canonical) {
    if (!c.brand_id) continue;
    if (!cohortByBrand.has(c.brand_id)) cohortByBrand.set(c.brand_id, []);
    cohortByBrand.get(c.brand_id)!.push(c);
  }
  const outrosBrand = (brands as { id: string; slug: string }[]).find((b) => b.slug === "outros");
  const outrosCohort = outrosBrand ? cohortByBrand.get(outrosBrand.id) ?? [] : [];
  const outrosSample = [...outrosCohort].sort(() => Math.random() - 0.5).slice(0, OUTROS_SAMPLE_SIZE);
  const outrosScale = outrosCohort.length / Math.max(1, outrosSample.length);

  async function run(categoryOf: (id: string | null) => string, brandOf: (id: string | null) => string, label: string): Promise<RunTotals> {
    const totals = newTotals();
    console.log(`\n— Rodando "${label}" —`);
    let brandsProcessed = 0;
    for (const [brandId, cohort] of cohortByBrand.entries()) {
      if (outrosBrand && brandId === outrosBrand.id) continue;
      if (cohort.length < 2) continue;
      evaluateGroup(cohort, storesByCanonical, categoryOf, brandOf, totals);
      brandsProcessed++;
    }
    console.log(`  brands reais processados: ${brandsProcessed}`);

    if (outrosBrand && outrosSample.length > 0) {
      const sampleTotals = newTotals();
      evaluateGroup(outrosSample, storesByCanonical, categoryOf, brandOf, sampleTotals);
      totals.totalCross += Math.round(sampleTotals.totalCross * outrosScale);
      totals.crossCategoryGateFailed += Math.round(sampleTotals.crossCategoryGateFailed * outrosScale);
      totals.crossGatePassedBelowThreshold += Math.round(sampleTotals.crossGatePassedBelowThreshold * outrosScale);
      totals.crossAlta += Math.round(sampleTotals.crossAlta * outrosScale);
      totals.crossMedia += Math.round(sampleTotals.crossMedia * outrosScale);
      totals.crossManual += Math.round(sampleTotals.crossManual * outrosScale);
      totals.aboveThresholdExamples.push(...sampleTotals.aboveThresholdExamples.map((s) => `[amostra outros] ${s}`));
      for (const id of sampleTotals.persistedBestPairs) totals.persistedBestPairs.add(id);
    }
    return totals;
  }

  const baseline = await run(baselineCategoryOf, baselineBrandOf, "BASELINE (sem normalização)");
  const categoriaOnly = await run(clusteredCategoryOf, baselineBrandOf, "CATEGORIA (66 clusters, verificação de sanidade vs. Κ-1)");
  const categoriaMarca = await run(clusteredCategoryOf, normalizedBrandOf, "CATEGORIA + MARCA (novidade desta Mission)");

  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  RESULTADO — Objetivo 7                                    ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);

  for (const [label, t] of [
    ["BASELINE", baseline],
    ["CATEGORIA", categoriaOnly],
    ["CATEGORIA+MARCA", categoriaMarca],
  ] as [string, RunTotals][]) {
    console.log(`${label}:`);
    console.log(`  pares cross-merchant avaliados: ${t.totalCross}`);
    console.log(`  bloqueados no gate: ${t.crossCategoryGateFailed}`);
    console.log(`  gate passou, <70: ${t.crossGatePassedBelowThreshold}`);
    console.log(`  Alta (>=95): ${t.crossAlta} | Média (85-94): ${t.crossMedia} | Manual (70-84): ${t.crossManual}`);
    console.log(`  produtos com pelo menos 1 novo candidato cross-merchant >=70: ${t.persistedBestPairs.size}`);
  }

  console.log(`\n— Exemplos reais (CATEGORIA+MARCA, todos os pares >=70) —`);
  for (const ex of categoriaMarca.aboveThresholdExamples) console.log(`  ${ex}`);

  console.log("\n[kappa2-cross-merchant-simulation] done.");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
