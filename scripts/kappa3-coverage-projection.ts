/**
 * PROGRAM Κ — MISSION Κ-3 — Objetivo 7: Comparable Coverage Projection.
 *
 * Read-only. Builds on the same "+ PRODUCT SIGNATURE" pairing logic as
 * scripts/kappa3-cross-merchant-simulation.ts, but instead of reporting raw
 * pair/product counts, groups qualifying (>=70) cross-merchant pairs into
 * connected components (union-find) — the real shape a Merge Engine
 * approval would produce if every qualifying pair in a component were
 * executed — and buckets each resulting group by how many distinct stores
 * it would span (2/3/4/5+), the exact question Objetivo 7 asks.
 *
 * Uso: npx tsx scripts/kappa3-coverage-projection.ts
 */
import { getServiceClient } from "./lib/client";
import { ProductIdentityEngine } from "@/src/domains/product-identity/domain/ProductIdentityEngine";
import { CONFIDENCE_THRESHOLDS } from "@/src/domains/product-identity/types/enums";
import type { EvaluableProduct, MatchCandidate } from "@/src/domains/product-identity/types/product-identity.types";
import { normalizeBrandName } from "@/src/domains/taxonomy";
import { buildProductSignature } from "@/src/domains/product-intelligence";

const OUTROS_SAMPLE_SIZE = 500;

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

function signatureToSpecifications(sig: ReturnType<typeof buildProductSignature>): Record<string, string> {
  const out: Record<string, string> = {};
  if (sig.color.value) out.color = sig.color.value;
  if (sig.capacityGb.value !== null) out.capacity_gb = String(sig.capacityGb.value);
  if (sig.ramGb.value !== null) out.ram_gb = String(sig.ramGb.value);
  if (sig.screenSizeIn.value !== null) out.screen_size_in = String(sig.screenSizeIn.value);
  if (sig.processor.value) out.processor = sig.processor.value;
  if (sig.gpu.value) out.gpu = sig.gpu.value;
  if (sig.voltage.value) out.voltage = sig.voltage.value;
  if (sig.powerW.value !== null) out.power_w = String(sig.powerW.value);
  if (sig.ean.value) out.ean = sig.ean.value;
  if (sig.manufacturerCode.value) out.manufacturer_code = sig.manufacturerCode.value;
  if (sig.model.value) out.model = sig.model.value;
  return out;
}

// Union-Find — the standard tool for "which pairs end up in the same group
// if every edge were applied," nothing bespoke.
class UnionFind {
  private parent = new Map<string, string>();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    const p = this.parent.get(x)!;
    if (p === x) return x;
    const root = this.find(p);
    this.parent.set(x, root);
    return root;
  }
  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
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
  console.log("║  MISSION Κ-3 — Objetivo 7: Comparable Coverage Projection  ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const [canonical, categories, brands, storesByCanonical] = await Promise.all([
    loadCanonicalProducts(supabase),
    supabase.from("categories").select("id, slug").then((r) => r.data ?? []),
    supabase.from("brands").select("id, name, slug").then((r) => r.data ?? []),
    loadStoresByCanonical(supabase),
  ]);

  // BEFORE — real, measured (Program Ω pilot state, 2026-07-15).
  console.log("— ANTES (medido, estado real de produção) —");
  const beforeHistogram = { 1: 0, 2: 0, 3: 0, 4: 0, "5plus": 0 };
  for (const storeSet of storesByCanonical.values()) {
    const n = storeSet.size;
    if (n === 1) beforeHistogram[1]++;
    else if (n === 2) beforeHistogram[2]++;
    else if (n === 3) beforeHistogram[3]++;
    else if (n === 4) beforeHistogram[4]++;
    else beforeHistogram["5plus"]++;
  }
  console.log(`  1 loja: ${beforeHistogram[1]} | 2 lojas: ${beforeHistogram[2]} | 3 lojas: ${beforeHistogram[3]} | 4 lojas: ${beforeHistogram[4]} | 5+ lojas: ${beforeHistogram["5plus"]}`);

  const categoryIdBySlug = new Map((categories as { id: string; slug: string }[]).map((c) => [c.slug, c.id]));
  const categoryIdToClusterId = new Map<string, string>();
  for (const group of VALIDATED_CLUSTERS) {
    const ids = group.map((slug) => categoryIdBySlug.get(slug)).filter((id): id is string => !!id);
    if (ids.length < 2) continue;
    for (const id of ids) categoryIdToClusterId.set(id, ids[0]);
  }
  const brandIdToCanonicalId = new Map<string, string>();
  const byNormalizedName = new Map<string, string>();
  for (const b of brands as { id: string; name: string }[]) {
    const norm = normalizeBrandName(b.name);
    const existing = byNormalizedName.get(norm);
    if (existing) brandIdToCanonicalId.set(b.id, existing);
    else byNormalizedName.set(norm, b.id);
  }
  const brandNameById = new Map((brands as { id: string; name: string }[]).map((b) => [b.id, b.name]));
  const clusteredCategoryOf = (id: string | null) => (id ? categoryIdToClusterId.get(id) ?? id : "");
  const normalizedBrandOf = (id: string | null) => (id ? brandIdToCanonicalId.get(id) ?? id : "");
  const signatureSpecsOf = (c: CanonicalRow) =>
    signatureToSpecifications(buildProductSignature({ id: c.id, name: c.name, brandName: c.brand_id ? brandNameById.get(c.brand_id) ?? null : null, specifications: c.specifications }));

  const cohortByBrand = new Map<string, CanonicalRow[]>();
  for (const c of canonical) {
    if (!c.brand_id) continue;
    if (!cohortByBrand.has(c.brand_id)) cohortByBrand.set(c.brand_id, []);
    cohortByBrand.get(c.brand_id)!.push(c);
  }
  const outrosBrand = (brands as { id: string; slug: string }[]).find((b) => b.slug === "outros");
  const outrosCohort = outrosBrand ? cohortByBrand.get(outrosBrand.id) ?? [] : [];
  const outrosSample = new Set([...outrosCohort].sort(() => Math.random() - 0.5).slice(0, OUTROS_SAMPLE_SIZE).map((c) => c.id));

  const uf = new UnionFind();
  let pairsFound = 0;

  function evaluateGroup(cohort: CanonicalRow[]) {
    for (const source of cohort) {
      if (cohort.length <= 1) continue;
      const sourceEval: EvaluableProduct = {
        slug: source.canonical_slug,
        name: source.name,
        brandSlug: normalizedBrandOf(source.brand_id),
        categorySlug: clusteredCategoryOf(source.category_id),
        specifications: signatureSpecsOf(source),
      };
      const sourceStores = storesByCanonical.get(source.id) ?? new Set<string>();

      for (const cand of cohort) {
        if (cand.id === source.id) continue;
        const candEval: MatchCandidate = {
          productId: cand.id,
          slug: cand.canonical_slug,
          name: cand.name,
          brandSlug: normalizedBrandOf(cand.brand_id),
          categorySlug: clusteredCategoryOf(cand.category_id),
          specifications: signatureSpecsOf(cand),
        };
        const candStores = storesByCanonical.get(cand.id) ?? new Set<string>();
        const union = new Set([...sourceStores, ...candStores]);
        if (union.size < 2) continue;

        const result = engine.evaluate(sourceEval, [candEval]);
        if (result.confidence >= CONFIDENCE_THRESHOLDS.possible && !result.mismatchedAttributes.includes("category") && !result.mismatchedAttributes.includes("brand")) {
          uf.union(source.id, cand.id);
          pairsFound++;
        }
      }
    }
  }

  for (const [brandId, cohort] of cohortByBrand.entries()) {
    if (outrosBrand && brandId === outrosBrand.id) continue;
    if (cohort.length < 2) continue;
    evaluateGroup(cohort);
  }
  if (outrosBrand) {
    const sampleCohort = outrosCohort.filter((c) => outrosSample.has(c.id));
    evaluateGroup(sampleCohort);
  }

  console.log(`\nPares qualificados (>=70, gate ok) unidos via union-find: ${pairsFound}`);
  console.log("Nota: a amostra 'outros' não é escalada aqui (union-find não é uma soma linear) — este número é o resultado real medido sobre a amostra, um piso, não uma extrapolação.");

  // Group by root, compute resulting store-count per component.
  const allTouchedIds = new Set<string>();
  for (const cohort of cohortByBrand.values()) {
    for (const c of cohort) allTouchedIds.add(c.id);
  }
  const memberIdsByRoot = new Map<string, string[]>();
  for (const id of allTouchedIds) {
    const root = uf.find(id);
    if (!memberIdsByRoot.has(root)) memberIdsByRoot.set(root, []);
    memberIdsByRoot.get(root)!.push(id);
  }

  const afterHistogram = { ...beforeHistogram };
  let componentsChanged = 0;
  for (const members of memberIdsByRoot.values()) {
    if (members.length <= 1) continue; // untouched product, already counted in beforeHistogram
    componentsChanged++;
    const resultingStores = new Set<string>();
    for (const m of members) for (const s of storesByCanonical.get(m) ?? []) resultingStores.add(s);

    // Remove each member's individual prior contribution to the "before" bucket...
    for (const m of members) {
      const n = storesByCanonical.get(m)?.size ?? 0;
      if (n === 1) afterHistogram[1]--;
      else if (n === 2) afterHistogram[2]--;
      else if (n === 3) afterHistogram[3]--;
      else if (n === 4) afterHistogram[4]--;
      else afterHistogram["5plus"]--;
    }
    // ...and add the single merged group's resulting bucket once.
    const n = resultingStores.size;
    if (n === 1) afterHistogram[1]++;
    else if (n === 2) afterHistogram[2]++;
    else if (n === 3) afterHistogram[3]++;
    else if (n === 4) afterHistogram[4]++;
    else afterHistogram["5plus"]++;
  }

  console.log(`\nGrupos (canonical products distintos) unidos em pelo menos 1 par qualificado: ${componentsChanged}`);
  console.log("\n— DEPOIS (projeção — se todos os pares qualificados fossem aprovados+executados) —");
  console.log(`  1 loja: ${afterHistogram[1]} | 2 lojas: ${afterHistogram[2]} | 3 lojas: ${afterHistogram[3]} | 4 lojas: ${afterHistogram[4]} | 5+ lojas: ${afterHistogram["5plus"]}`);

  console.log("\n[kappa3-coverage-projection] done.");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
