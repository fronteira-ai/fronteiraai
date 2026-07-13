/**
 * PROGRAM Κ (KAPPA) — MISSION Κ-1 — Objetivo 4: Impact Simulation.
 *
 * Read-only, in-memory only. No writes, no new categories, no migrations,
 * no change to canonical_products/category_id in the database. Reuses the
 * exact method Sprint 2.7 used (scripts/sprint27-identity-simulation.ts,
 * documented in docs/product/CROSS_MERCHANT_SIMULATION.md): the real,
 * unmodified `ProductIdentityEngine.evaluate()` called once per directional
 * pair within each brand cohort, marketplace-wide (real brands exhaustive +
 * "Outros" catch-all sampled and scaled, same as Sprint 2.7 — exhaustive
 * evaluation of "Outros" costs 83% of the total pairs for a bucket that
 * structurally can't respect the brand gate anyway).
 *
 * What's new here: every pairwise evaluation is run TWICE per source —
 * once against real `canonical_products.category_id` (BASELINE, should
 * reproduce Sprint 2.7's published numbers as a sanity check) and once
 * against `category_id` remapped through the validated equivalence
 * clusters from CATEGORY_CLUSTER_MATRIX.md (TREATMENT). The delta between
 * the two is the measured impact of category normalization on the
 * category gate — nothing else about the engine changes.
 *
 * The cluster map below is deliberately NOT the raw output of
 * kappa1-category-similarity.ts — it is that output after a manual PT/ES
 * domain review (documented in CATEGORY_SIMILARITY_ANALYSIS.md §4) that
 * dropped ~8 clusters/members that were lexically close but semantically
 * wrong (e.g. "Fritadeira"/"Frigideira" — fryer vs frying pan; "Caldeira"/
 * "Cadeira" — boiler vs chair) or structurally a parent/child relationship
 * rather than a same-concept synonym (e.g. "Nintendo Switch" the console
 * vs "Jogo para Nintendo Switch" a game for it — same class of error
 * Sprint 2.4 already flagged for "Games").
 *
 * Uso:
 *   npx tsx scripts/kappa1-impact-simulation.ts
 */
import { getServiceClient } from "./lib/client";
import { ProductIdentityEngine } from "@/src/domains/product-identity/domain/ProductIdentityEngine";
import { CONFIDENCE_THRESHOLDS } from "@/src/domains/product-identity/types/enums";
import type { EvaluableProduct, MatchCandidate } from "@/src/domains/product-identity/types/product-identity.types";

const OUTROS_SAMPLE_SIZE = 500;

// Validated equivalence clusters (post manual QA — see CATEGORY_CLUSTER_MATRIX.md
// §"Clusters validados"). Each inner array is a group of category slugs that
// should share one canonical category identity. Slugs not listed here keep
// their own identity unchanged.
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
  ["aspiradores", "aspirador", "aspiradora"], // "Aparadores" excluded (different concept)
  ["auriculares", "headsets", "headset"],
  ["memoria-ram", "memoria-ram-para-notebook", "memoria-ram-para-pc"],
  ["jogos", "juegos", "games"],
  ["pendrive", "pendrives"],
  ["cuidado-personal", "cuidados-personales"],
  ["cameras-fotograficas", "camaras-fotograficas"],
  ["cameras", "camaras"], // "Camperas" excluded (jackets, ES — coincidental match)
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
  [
    "cabos-adaptadores-para-tv",
    "cabos-adaptadores-e-hubs",
    "cabos-e-adaptadores",
    "cabos-adaptadores-para-audio",
    "cabos-adaptadores-automotivos",
    "adaptadores-carregadores-e-cabos",
  ],
  ["condicionador", "condicionadores"],
  ["projetores", "proyectores", "proyector"],
  ["reloj-femenino", "relojes-femeninos"],
  ["processador", "processadores", "procesadores"],
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
  // Excluded on purpose (semantically wrong or parent/child, not same-concept):
  // nintendo-switch + jogo-para-nintendo-switch (console vs. a game for it)
  // ar-condicionado + controle-para-ar-condicionado (device vs. its remote)
  // cameras-de-acao + acessorios-para-camera-de-acao (device vs. accessory)
  // apple-accesorios + accesorios-para-apple-watch (general vs. specific accessory)
  // fritadeira + frigideira (fryer vs. frying pan — coincidental edit distance)
  // caldeira + cadeira (boiler vs. chair — coincidental edit distance)
  // condimenteros + condimentos (holder vs. product)
  // estabilizadores + esterilizadores (voltage stabilizer vs. sterilizer)
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

function toEvaluable(c: CanonicalRow, categoryOf: (id: string | null) => string): EvaluableProduct {
  return {
    slug: c.canonical_slug,
    name: c.name,
    brandSlug: c.brand_id ?? "",
    categorySlug: categoryOf(c.category_id),
    specifications: c.specifications ?? {},
  };
}
function toCandidate(c: CanonicalRow, categoryOf: (id: string | null) => string): MatchCandidate {
  return {
    productId: c.id,
    slug: c.canonical_slug,
    name: c.name,
    brandSlug: c.brand_id ?? "",
    categorySlug: categoryOf(c.category_id),
    specifications: c.specifications ?? {},
  };
}

interface RunTotals {
  totalCross: number;
  crossCategoryGateFailed: number;
  crossGatePassedBelowThreshold: number;
  crossAboveThreshold: number;
  maxCrossConfidence: number;
  maxCrossExample: string;
  persistedBest: number; // Scenario A (current behavior): best candidate per source if >=70
  aboveThresholdExamples: string[]; // every cross-merchant pair that reached >=70, for citation
}

function newTotals(): RunTotals {
  return {
    totalCross: 0,
    crossCategoryGateFailed: 0,
    crossGatePassedBelowThreshold: 0,
    crossAboveThreshold: 0,
    maxCrossConfidence: 0,
    maxCrossExample: "",
    persistedBest: 0,
    aboveThresholdExamples: [],
  };
}

function evaluateGroup(
  sources: CanonicalRow[],
  cohort: CanonicalRow[],
  storesByCanonical: Map<string, Set<string>>,
  categoryOf: (id: string | null) => string,
  totals: RunTotals
) {
  for (const source of sources) {
    if (cohort.length <= 1) continue;
    const sourceEval = toEvaluable(source, categoryOf);
    const sourceStores = storesByCanonical.get(source.id) ?? new Set<string>();

    let bestConfidence = -1;
    for (const cand of cohort) {
      if (cand.id === source.id) continue;
      const result = engine.evaluate(sourceEval, [toCandidate(cand, categoryOf)]);
      const candStores = storesByCanonical.get(cand.id) ?? new Set<string>();
      const union = new Set([...sourceStores, ...candStores]);
      const crossMerchant = union.size >= 2;
      if (result.confidence > bestConfidence) bestConfidence = result.confidence;

      if (!crossMerchant) continue;
      totals.totalCross++;
      if (result.mismatchedAttributes.includes("category")) {
        totals.crossCategoryGateFailed++;
      } else if (result.confidence >= CONFIDENCE_THRESHOLDS.possible) {
        totals.crossAboveThreshold++;
        totals.aboveThresholdExamples.push(
          `"${source.name}" [${source.canonical_slug}] vs "${cand.name}" [${cand.canonical_slug}] (conf=${result.confidence}, matched=[${result.matchedAttributes.join(",")}])`
        );
      } else {
        totals.crossGatePassedBelowThreshold++;
      }
      if (result.confidence > totals.maxCrossConfidence) {
        totals.maxCrossConfidence = result.confidence;
        totals.maxCrossExample = `"${source.name}" vs "${cand.name}" (conf=${result.confidence})`;
      }
    }
    if (bestConfidence >= CONFIDENCE_THRESHOLDS.possible) totals.persistedBest++;
  }
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
      if (!map.has(cid)) map.set(cid, new Set());
      map.get(cid)!.add(o.store_id as string);
    }
    if (data.length < 1000) break;
  }
  return map;
}

async function main() {
  const supabase = getServiceClient();
  console.log(`\n[kappa1-impact-simulation] loading data...\n`);

  const [canonical, categories, storesByCanonical, brandRows] = await Promise.all([
    loadCanonicalProducts(supabase),
    supabase.from("categories").select("id, slug").then((r) => r.data ?? []),
    loadStoresByCanonical(supabase),
    supabase.from("brands").select("id, slug, name").then((r) => r.data ?? []),
  ]);

  const categoryIdBySlug = new Map((categories as { id: string; slug: string }[]).map((c) => [c.slug, c.id]));
  const categoryIdToClusterId = new Map<string, string>();
  let clusteredCategoriesCovered = 0;
  for (const group of VALIDATED_CLUSTERS) {
    const ids = group.map((slug) => categoryIdBySlug.get(slug)).filter((id): id is string => !!id);
    if (ids.length < 2) {
      console.warn(`[warn] cluster [${group.join(", ")}] resolved to <2 real category ids — skipping`);
      continue;
    }
    clusteredCategoriesCovered += ids.length;
    const canonicalId = ids[0];
    for (const id of ids) categoryIdToClusterId.set(id, canonicalId);
  }
  console.log(`Clusters validados aplicados: ${VALIDATED_CLUSTERS.length}, cobrindo ${clusteredCategoriesCovered} categorias reais.`);

  const baselineCategoryOf = (id: string | null) => id ?? "";
  const clusteredCategoryOf = (id: string | null) => (id ? categoryIdToClusterId.get(id) ?? id : "");

  const cohortByBrand = new Map<string, CanonicalRow[]>();
  for (const c of canonical) {
    if (!c.brand_id) continue;
    if (!cohortByBrand.has(c.brand_id)) cohortByBrand.set(c.brand_id, []);
    cohortByBrand.get(c.brand_id)!.push(c);
  }
  const outrosBrand = (brandRows as { id: string; slug: string }[]).find((b) => b.slug === "outros");

  // Sampled ONCE and reused for both runs — baseline and treatment must see
  // the exact same "outros" sample, otherwise independent random draws add
  // sampling noise on top of the category-clustering effect being measured,
  // which is exactly the kind of confound this Mission's mandate forbids
  // ("nenhuma conclusão sem medição"). Category membership never changes
  // which canonical products fall into a brand cohort, only how the gate
  // scores them — so re-using one sample across both runs is valid.
  const outrosCohort = outrosBrand ? cohortByBrand.get(outrosBrand.id) ?? [] : [];
  const outrosSample = [...outrosCohort].sort(() => Math.random() - 0.5).slice(0, OUTROS_SAMPLE_SIZE);
  const outrosScale = outrosCohort.length / Math.max(1, outrosSample.length);

  async function runMarketplace(categoryOf: (id: string | null) => string, label: string): Promise<RunTotals> {
    const totals = newTotals();
    console.log(`\n— Rodando "${label}" —`);
    let brandsProcessed = 0;
    for (const [brandId, cohort] of cohortByBrand.entries()) {
      if (outrosBrand && brandId === outrosBrand.id) continue;
      if (cohort.length < 2) continue;
      evaluateGroup(cohort, cohort, storesByCanonical, categoryOf, totals);
      brandsProcessed++;
    }
    console.log(`  brands reais processados: ${brandsProcessed}`);

    if (outrosBrand && outrosSample.length > 0) {
      const sampleTotals = newTotals();
      evaluateGroup(outrosSample, outrosSample, storesByCanonical, categoryOf, sampleTotals);
      console.log(`  "outros": amostra ${outrosSample.length}/${outrosCohort.length} (mesma amostra em ambas as rodadas), escala ${outrosScale.toFixed(2)}x`);
      totals.totalCross += Math.round(sampleTotals.totalCross * outrosScale);
      totals.crossCategoryGateFailed += Math.round(sampleTotals.crossCategoryGateFailed * outrosScale);
      totals.crossGatePassedBelowThreshold += Math.round(sampleTotals.crossGatePassedBelowThreshold * outrosScale);
      totals.crossAboveThreshold += Math.round(sampleTotals.crossAboveThreshold * outrosScale);
      totals.persistedBest += Math.round(sampleTotals.persistedBest * outrosScale);
      totals.aboveThresholdExamples.push(...sampleTotals.aboveThresholdExamples.map((s) => `[amostra "outros"] ${s}`));
      if (sampleTotals.maxCrossConfidence > totals.maxCrossConfidence) {
        totals.maxCrossConfidence = sampleTotals.maxCrossConfidence;
        totals.maxCrossExample = sampleTotals.maxCrossExample;
      }
    }
    return totals;
  }

  const baseline = await runMarketplace(baselineCategoryOf, "BASELINE (categorias reais, sem cluster)");
  const treatment = await runMarketplace(clusteredCategoryOf, "TREATMENT (categorias remapeadas pelos clusters validados)");

  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  MISSION Κ-1 — Objetivo 4: Impact Simulation — RESULTADO   ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);

  console.log("BASELINE:", baseline);
  console.log("TREATMENT:", treatment);

  console.log(`\n— Delta —`);
  console.log(`Pares cross-merchant que deixam de falhar no gate de categoria: ${baseline.crossCategoryGateFailed - treatment.crossCategoryGateFailed}`);
  console.log(`Pares cross-merchant "gate passou, <70": baseline=${baseline.crossGatePassedBelowThreshold} treatment=${treatment.crossGatePassedBelowThreshold}`);
  console.log(`Pares cross-merchant >=70 (candidatos reais): baseline=${baseline.crossAboveThreshold} treatment=${treatment.crossAboveThreshold}`);
  console.log(`Maior confiança cross-merchant observada: baseline=${baseline.maxCrossConfidence} (${baseline.maxCrossExample}) | treatment=${treatment.maxCrossConfidence} (${treatment.maxCrossExample})`);

  console.log(`\n— Todos os pares cross-merchant >=70 no TREATMENT (para citação) —`);
  for (const ex of treatment.aboveThresholdExamples) console.log(`  ${ex}`);
  console.log(`\n— Todos os pares cross-merchant >=70 no BASELINE (para citação) —`);
  for (const ex of baseline.aboveThresholdExamples) console.log(`  ${ex}`);
  console.log(`Candidatos persistidos hoje (Cenário A, best-per-source >=70): baseline=${baseline.persistedBest} treatment=${treatment.persistedBest}`);

  console.log("\n[kappa1-impact-simulation] done.");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
