/**
 * MISSION Ω-COMPARISON AUDIT — Product Matching Forensics.
 *
 * 100% read-only. No writes anywhere, no code/threshold/weight changes.
 * Runs the REAL, unmodified ProductIdentityEngine + the exact candidate-pool
 * / category-gate / specification logic CanonicalMergeSuggestionService uses
 * in production, directly against live data, to measure — not guess — why
 * matching products remain separated.
 *
 * Uso:
 *   npx tsx scripts/comparison-forensics-audit.ts
 */

import { getServiceClient } from "./lib/client";
import { ProductIdentityEngine, CONFIDENCE_THRESHOLDS } from "@/src/domains/product-identity";
import type { EvaluableProduct, MatchCandidate, MatchResult } from "@/src/domains/product-identity/types/product-identity.types";
import { findNodeByRealCategorySlug } from "@/src/domains/taxonomy";
import { buildProductSignature, type ProductSignature } from "@/src/domains/product-intelligence";
import { MergeCandidateStatus } from "@/src/domains/canonical-catalog";

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

// ── Exact replicas of the private functions in CanonicalMergeSuggestionService.ts ──
// (imported functions are the real, unmodified ones; only the private glue is
// re-derived here, byte-for-byte, for a read-only measurement — never a
// second competing implementation of scoring logic itself.)

function resolveCategoryGateSlug(categoryId: string | null, realSlug: string | undefined): string {
  if (!categoryId) return "";
  const effectiveSlug = realSlug ?? categoryId;
  const universalNode = findNodeByRealCategorySlug(effectiveSlug);
  return universalNode?.slug ?? effectiveSlug;
}

function signatureToSpecifications(signature: ProductSignature): Record<string, string> {
  const spec: Record<string, string> = {};
  if (signature.model.value !== null) spec.model = signature.model.value;
  if (signature.color.value !== null) spec.color = signature.color.value;
  if (signature.capacityGb.value !== null) spec.capacityGb = String(signature.capacityGb.value);
  if (signature.ramGb.value !== null) spec.ramGb = String(signature.ramGb.value);
  if (signature.screenSizeIn.value !== null) spec.screenSizeIn = String(signature.screenSizeIn.value);
  if (signature.processor.value !== null) spec.processor = signature.processor.value;
  if (signature.gpu.value !== null) spec.gpu = signature.gpu.value;
  if (signature.voltage.value !== null) spec.voltage = signature.voltage.value;
  if (signature.powerW.value !== null) spec.powerW = String(signature.powerW.value);
  if (signature.ean.value !== null) spec.ean = signature.ean.value;
  if (signature.manufacturerCode.value !== null) spec.manufacturerCode = signature.manufacturerCode.value;
  if (signature.bundleIncludes.value !== null) spec.bundleIncludes = signature.bundleIncludes.value.join(", ");
  return spec;
}

interface CanonicalRow {
  id: string;
  canonical_slug: string;
  name: string;
  brand_id: string | null;
  category_id: string | null;
  specifications: Record<string, string> | null;
  is_active: boolean;
  merged_into_id: string | null;
}

function toEvaluable(row: CanonicalRow, categorySlugById: Map<string, string>): EvaluableProduct {
  const categorySlug = resolveCategoryGateSlug(row.category_id, row.category_id ? categorySlugById.get(row.category_id) : undefined);
  const signature = buildProductSignature({ id: row.id, name: row.name, brandName: null, specifications: row.specifications });
  return {
    slug: row.canonical_slug,
    name: row.name,
    brandSlug: row.brand_id ?? "",
    categorySlug,
    specifications: signatureToSpecifications(signature),
  };
}

function toCandidate(row: CanonicalRow, categorySlugById: Map<string, string>): MatchCandidate {
  const e = toEvaluable(row, categorySlugById);
  return { productId: row.id, slug: e.slug, name: e.name, brandSlug: e.brandSlug, categorySlug: e.categorySlug, specifications: e.specifications };
}

async function main() {
  const supabase = getServiceClient();
  console.log("=".repeat(80));
  console.log("MISSION Ω-COMPARISON AUDIT — Product Matching Forensics (read-only)");
  console.log("=".repeat(80));

  // ── Base data ────────────────────────────────────────────────────────
  const [productsCount, offersCount] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).then((r) => r.count ?? 0),
    supabase.from("offers").select("*", { count: "exact", head: true }).then((r) => r.count ?? 0),
  ]);

  const canonicalRows = await fetchAll<CanonicalRow>(async (from, to) =>
    supabase.from("canonical_products").select("id, canonical_slug, name, brand_id, category_id, specifications, is_active, merged_into_id").range(from, to)
  );
  const activeCanonical = canonicalRows.filter((c) => c.is_active);
  const inactiveCanonical = canonicalRows.filter((c) => !c.is_active);

  const offers = await fetchAll<{ id: string; store_id: string; product_id: string; canonical_product_id: string | null }>(async (from, to) =>
    supabase.from("offers").select("id, store_id, product_id, canonical_product_id").range(from, to)
  );

  const stores = await fetchAll<{ id: string; name: string; slug: string }>(async (from, to) => supabase.from("stores").select("id, name, slug").range(from, to));
  const storeById = new Map(stores.map((s) => [s.id, s]));

  const categories = await fetchAll<{ id: string; slug: string }>(async (from, to) => supabase.from("categories").select("id, slug").range(from, to));
  const categorySlugById = new Map(categories.map((c) => [c.id, c.slug]));

  const brands = await fetchAll<{ id: string; name: string }>(async (from, to) => supabase.from("brands").select("id, name").range(from, to));
  const brandNameById = new Map(brands.map((b) => [b.id, b.name]));

  const mergeCandidates = await fetchAll<{ id: string; source_canonical_product_id: string; target_canonical_product_id: string; confidence: number; status: string; algorithm_version: string }>(
    async (from, to) => supabase.from("merge_candidates").select("id, source_canonical_product_id, target_canonical_product_id, confidence, status, algorithm_version").range(from, to)
  );

  const mergeExecutions = await fetchAll<{ id: string; source_canonical_product_id: string; target_canonical_product_id: string; status: string; moved_offer_ids: string[] }>(
    async (from, to) => supabase.from("merge_executions").select("id, source_canonical_product_id, target_canonical_product_id, status, moved_offer_ids").range(from, to)
  );

  // canonical -> distinct store ids (ground truth grouping)
  const canonicalStores = new Map<string, Set<string>>();
  const canonicalOfferCount = new Map<string, number>();
  const productIdToOffer = new Map<string, { canonicalProductId: string | null; storeId: string }>();
  for (const o of offers) {
    productIdToOffer.set(o.product_id, { canonicalProductId: o.canonical_product_id, storeId: o.store_id });
    if (!o.canonical_product_id) continue;
    canonicalOfferCount.set(o.canonical_product_id, (canonicalOfferCount.get(o.canonical_product_id) ?? 0) + 1);
    const set = canonicalStores.get(o.canonical_product_id) ?? new Set<string>();
    set.add(o.store_id);
    canonicalStores.set(o.canonical_product_id, set);
  }

  // ══════════════════════════════════════════════════════════════════════
  console.log("\n### ANÁLISE 1 — CATÁLOGO ###\n");
  console.log(`Total de produtos (products): ${productsCount}`);
  console.log(`Total de offers: ${offersCount}`);
  console.log(`Total de Canonical Products: ${canonicalRows.length} (ativos: ${activeCanonical.length}, inativos/merged: ${inactiveCanonical.length})`);

  const dist = { "1": 0, "2": 0, "3-5": 0, "6-10": 0, ">10": 0 };
  let sumOffers = 0;
  let withOffers = 0;
  for (const c of activeCanonical) {
    const n = canonicalOfferCount.get(c.id) ?? 0;
    if (n === 0) continue;
    withOffers++;
    sumOffers += n;
    if (n === 1) dist["1"]++;
    else if (n === 2) dist["2"]++;
    else if (n <= 5) dist["3-5"]++;
    else if (n <= 10) dist["6-10"]++;
    else dist[">10"]++;
  }
  console.log(`Canonical Products ativos com >=1 offer: ${withOffers} (${(canonicalOfferCount.size)} chaves distintas em offers.canonical_product_id)`);
  console.log(`Média de offers por Canonical Product (entre os que têm >=1): ${(sumOffers / withOffers).toFixed(3)}`);
  console.log("Distribuição:", dist);

  const unlinkedOffers = offers.filter((o) => !o.canonical_product_id);
  console.log(`\nOffers SEM canonical_product_id (nunca entraram no bootstrap): ${unlinkedOffers.length} de ${offers.length} (${((unlinkedOffers.length / offers.length) * 100).toFixed(1)}%)`);
  const unlinkedByStore = new Map<string, number>();
  for (const o of unlinkedOffers) unlinkedByStore.set(o.store_id, (unlinkedByStore.get(o.store_id) ?? 0) + 1);
  console.log("Por loja:");
  for (const [storeId, n] of unlinkedByStore) {
    const store = storeById.get(storeId);
    const total = offers.filter((o) => o.store_id === storeId).length;
    console.log(`  ${store?.name ?? storeId}: ${n}/${total} offers não-bootstrapadas (${((n / total) * 100).toFixed(1)}%)`);
  }

  // ══════════════════════════════════════════════════════════════════════
  console.log("\n### ANÁLISE 2 e 3 — MATCHING / PRODUCT IDENTITY (live re-run do algoritmo real) ###\n");

  const grouped = activeCanonical.filter((c) => (canonicalStores.get(c.id)?.size ?? 0) >= 2);
  const notGrouped = activeCanonical.filter((c) => (canonicalStores.get(c.id)?.size ?? 0) < 2);
  console.log(`Agrupados (canonical com offers de >=2 lojas distintas): ${grouped.length}`);
  console.log(`Não agrupados (0 ou 1 loja): ${notGrouped.length}`);

  // brand pools from ALL canonical rows (active + inactive), same as the
  // real findByBrandId() query — it does not filter is_active.
  const byBrand = new Map<string, CanonicalRow[]>();
  for (const c of canonicalRows) {
    if (!c.brand_id) continue;
    const list = byBrand.get(c.brand_id) ?? [];
    list.push(c);
    byBrand.set(c.brand_id, list);
  }

  const engine = new ProductIdentityEngine();

  let noBrandId = 0;
  let noCandidates = 0;
  let evaluated = 0;
  let candidatePairsTotal = 0;
  let rejectedByGate = 0; // brand/category mismatch capped confidence
  let rejectedByThreshold = 0; // gates passed, confidence < 70
  let passedThreshold = 0; // confidence >= 70 (possible+) but still not grouped in reality
  const confidences: number[] = [];
  const rejectedConfidences: number[] = [];
  const passedConfidences: number[] = [];
  const rejectionDominantFactor = { "name-similarity": 0, specifications: 0, "model-number": 0 };
  const falseNegatives: { source: CanonicalRow; best: MatchCandidate; result: MatchResult }[] = [];
  const wouldBeDuplicates: { a: CanonicalRow; b: CanonicalRow; result: MatchResult }[] = [];
  const perStoreFalseNegative = new Map<string, number>();
  const perStoreNotGroupedTotal = new Map<string, number>();
  let fnCrossStore = 0;
  let fnSameStore = 0;
  let fnUnknownStore = 0;

  for (const source of notGrouped) {
    if (!source.brand_id) {
      noBrandId++;
      continue;
    }
    const pool = (byBrand.get(source.brand_id) ?? []).filter((c) => c.id !== source.id);
    if (pool.length === 0) {
      noCandidates++;
      continue;
    }
    evaluated++;
    candidatePairsTotal += pool.length;

    const evaluableSource = toEvaluable(source, categorySlugById);
    const candidates = pool.map((c) => toCandidate(c, categorySlugById));
    const result = engine.evaluate(evaluableSource, candidates);
    confidences.push(result.confidence);

    // approximate the source's own store for per-store false-negative attribution
    const sourceStoreId = [...(offers.find((o) => o.canonical_product_id === source.id) ? [offers.find((o) => o.canonical_product_id === source.id)!.store_id] : [])][0];
    if (sourceStoreId) perStoreNotGroupedTotal.set(sourceStoreId, (perStoreNotGroupedTotal.get(sourceStoreId) ?? 0) + 1);

    const gateFailed = result.mismatchedAttributes.includes("brand") || result.mismatchedAttributes.includes("category");
    if (result.confidence < CONFIDENCE_THRESHOLDS.possible) {
      if (gateFailed) {
        rejectedByGate++;
      } else {
        rejectedByThreshold++;
        rejectedConfidences.push(result.confidence);
        // dominant factor = the scored (non-gate) factor that lost the most weight
        const scored = result.penalties.filter((p) => p.attribute !== "brand-category-gate");
        if (scored.length > 0) {
          const worst = scored.reduce((a, b) => (b.weightLost > a.weightLost ? b : a));
          if (worst.attribute in rejectionDominantFactor) {
            (rejectionDominantFactor as Record<string, number>)[worst.attribute]++;
          }
        }
      }
    } else {
      passedThreshold++;
      passedConfidences.push(result.confidence);
      const bestCandidate = candidates.find((c) => c.productId === result.candidateProductId);
      if (bestCandidate) {
        falseNegatives.push({ source, best: bestCandidate, result });
        if (sourceStoreId) perStoreFalseNegative.set(sourceStoreId, (perStoreFalseNegative.get(sourceStoreId) ?? 0) + 1);
        if (result.confidence >= CONFIDENCE_THRESHOLDS.auto) {
          const targetRow = pool.find((p) => p.id === result.candidateProductId);
          if (targetRow) wouldBeDuplicates.push({ a: source, b: targetRow, result });
        }
        // Cross-store vs same-store tagging — the decisive question for
        // Analysis 8: does acting on this false negative actually increase
        // cross-marketplace comparability, or just consolidate duplicate
        // listings within the SAME store?
        const targetStoreSet = canonicalStores.get(result.candidateProductId!);
        const targetStoreId = targetStoreSet && targetStoreSet.size === 1 ? [...targetStoreSet][0] : null;
        if (sourceStoreId && targetStoreId) {
          if (sourceStoreId === targetStoreId) fnSameStore++;
          else fnCrossStore++;
        } else {
          fnUnknownStore++;
        }
      }
    }
  }

  console.log(`\nFonte: Canonical Products NÃO agrupados = ${notGrouped.length} (população desta análise)`);
  console.log(`  Sem brand_id (nunca avaliados pelo algoritmo — suggestMergesFor retorna imediatamente): ${noBrandId}`);
  console.log(`  Com brand_id mas sem nenhum candidato da mesma marca (pool vazio): ${noCandidates}`);
  console.log(`  Avaliados (candidatos encontrados e comparados): ${evaluated}`);
  console.log(`  Total de comparações par-a-par realizadas: ${candidatePairsTotal} (média ${(candidatePairsTotal / Math.max(evaluated, 1)).toFixed(2)} candidatos/fonte)`);
  console.log(`  Rejeitados pelo gate (marca OU categoria divergente — cap em 40): ${rejectedByGate}`);
  console.log(`    (nota: marca nunca diverge de fato dentro do pool, pois o pool já é filtrado por brand_id — todo gate-fail aqui é categoria)`);
  console.log(`  Rejeitados pelo threshold (gate passou, confiança < 70): ${rejectedByThreshold}`);
  console.log(`    Fator dominante da rejeição: ${JSON.stringify(rejectionDominantFactor)}`);
  console.log(`  Passaram do threshold (confiança >= 70) mas PERMANECEM não-agrupados hoje: ${passedThreshold} — FALSOS NEGATIVOS REAIS`);

  function stats(arr: number[]) {
    if (arr.length === 0) return { avg: 0, max: 0, min: 0 };
    return { avg: arr.reduce((a, b) => a + b, 0) / arr.length, max: Math.max(...arr), min: Math.min(...arr) };
  }
  console.log(`\nConfidence (todos avaliados, n=${confidences.length}):`, stats(confidences));
  console.log(`Confidence (rejeitados por threshold, n=${rejectedConfidences.length}):`, stats(rejectedConfidences));
  console.log(`Confidence (passaram threshold mas não agrupados, n=${passedConfidences.length}):`, stats(passedConfidences));
  console.log(`\nDos ${passedThreshold} que passaram do threshold: cross-store (ganho real de comparabilidade) = ${fnCrossStore} | same-store (duplicata dentro da mesma loja, NÃO aumenta CPC) = ${fnSameStore} | indeterminado = ${fnUnknownStore}`);
  console.log(`\nDESTES, quantos atingiram tier AUTO (>=95) e ainda são canonical products DIFERENTES (duplicata real, deveria ter sido unida): ${wouldBeDuplicates.length}`);
  {
    let autoCross = 0;
    let autoSame = 0;
    for (const d of wouldBeDuplicates) {
      const aStores = canonicalStores.get(d.a.id);
      const bStores = canonicalStores.get(d.b.id);
      const aStore = aStores && aStores.size === 1 ? [...aStores][0] : null;
      const bStore = bStores && bStores.size === 1 ? [...bStores][0] : null;
      if (aStore && bStore) {
        if (aStore === bStore) autoSame++;
        else autoCross++;
      }
    }
    console.log(`  Dos 89 tier AUTO: cross-store = ${autoCross} | same-store = ${autoSame}`);
  }

  // ══════════════════════════════════════════════════════════════════════
  console.log("\n### ANÁLISE 4 — MERGE ENGINE (integridade real) ###\n");
  const statusCounts: Record<string, number> = {};
  for (const mc of mergeCandidates) statusCounts[mc.status] = (statusCounts[mc.status] ?? 0) + 1;
  console.log(`merge_candidates total: ${mergeCandidates.length}`, statusCounts);
  console.log(`merge_executions total: ${mergeExecutions.length} (executed: ${mergeExecutions.filter((e) => e.status === "executed").length}, rolled_back: ${mergeExecutions.filter((e) => e.status === "rolled_back").length})`);

  let integrityViolations = 0;
  for (const ex of mergeExecutions) {
    if (ex.status !== "executed") continue;
    const sourceRow = canonicalRows.find((c) => c.id === ex.source_canonical_product_id);
    if (!sourceRow) continue;
    if (sourceRow.is_active !== false || sourceRow.merged_into_id !== ex.target_canonical_product_id) {
      integrityViolations++;
      console.log(`  VIOLAÇÃO: execution ${ex.id} — source ${sourceRow.id} is_active=${sourceRow.is_active} merged_into_id=${sourceRow.merged_into_id} (esperado: false / ${ex.target_canonical_product_id})`);
    }
  }
  console.log(`Violações de integridade (source não desativado corretamente após merge executado): ${integrityViolations}`);

  console.log(`\nDuplicatas reais (canonical products ativos que o algoritmo re-avaliado hoje classifica como tier AUTO um contra o outro): ${wouldBeDuplicates.length}`);
  for (const d of wouldBeDuplicates.slice(0, 10)) {
    console.log(`  "${d.a.name}" (${d.a.id}) <-> "${d.b.name}" (${d.b.id}) — confiança ${d.result.confidence}`);
  }

  // ══════════════════════════════════════════════════════════════════════
  console.log("\n### ANÁLISE 6 — POR MARKETPLACE ###\n");
  const storeCanonicalGroupedCount = new Map<string, { total: number; grouped: number }>();
  for (const c of activeCanonical) {
    const storeSet = canonicalStores.get(c.id);
    if (!storeSet || storeSet.size === 0) continue;
    const isGrouped = storeSet.size >= 2;
    for (const storeId of storeSet) {
      const cur = storeCanonicalGroupedCount.get(storeId) ?? { total: 0, grouped: 0 };
      cur.total++;
      if (isGrouped) cur.grouped++;
      storeCanonicalGroupedCount.set(storeId, cur);
    }
  }
  const ranking = [...storeCanonicalGroupedCount.entries()]
    .map(([storeId, v]) => ({ store: storeById.get(storeId)?.name ?? storeId, total: v.total, grouped: v.grouped, rate: v.total > 0 ? (v.grouped / v.total) * 100 : 0 }))
    .sort((a, b) => b.rate - a.rate);
  console.log("Ranking taxa de agrupamento (canonical products com >=2 lojas / total de canonical products daquela loja):");
  for (const r of ranking) console.log(`  ${r.store}: ${r.grouped}/${r.total} = ${r.rate.toFixed(1)}%`);

  console.log("\nFalsos negativos (confiança >=70 no re-run mas ainda não agrupado) por loja de origem:");
  for (const [storeId, n] of perStoreFalseNegative) {
    const total = perStoreNotGroupedTotal.get(storeId) ?? 0;
    console.log(`  ${storeById.get(storeId)?.name ?? storeId}: ${n} falsos negativos de ${total} não-agrupados avaliados (${total > 0 ? ((n / total) * 100).toFixed(1) : "0.0"}%)`);
  }

  // ══════════════════════════════════════════════════════════════════════
  console.log("\n### ANÁLISE 7 — CASOS REAIS ###\n");
  console.log("-- 20 SUCESSOS (canonical products agrupados, >=2 lojas) --");
  for (const c of grouped.slice(0, 20)) {
    const storeSet = canonicalStores.get(c.id)!;
    const storeNames = [...storeSet].map((id) => storeById.get(id)?.name ?? id).join(", ");
    console.log(`  "${c.name}" (marca: ${brandNameById.get(c.brand_id ?? "") ?? "?"}) — ${storeSet.size} lojas: ${storeNames} — ${canonicalOfferCount.get(c.id)} offers`);
  }

  console.log("\n-- 20 FALSOS NEGATIVOS (algoritmo hoje diria >=70 mas seguem separados) --");
  for (const fn of falseNegatives.slice(0, 20)) {
    console.log(`  "${fn.source.name}" <-> "${fn.best.name}" — confiança ${fn.result.confidence} (tier ${fn.result.tier}) — matched: [${fn.result.matchedAttributes.join(",")}] mismatched: [${fn.result.mismatchedAttributes.join(",")}]`);
  }
  console.log(`  (total real de falsos negativos encontrados: ${falseNegatives.length})`);

  console.log("\n-- Candidatos a FALSOS POSITIVOS (agrupados hoje, nomes com baixa similaridade textual simples) --");
  function crudeTokenSet(s: string): Set<string> {
    return new Set(
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
    );
  }
  function crudeJaccard(a: Set<string>, b: Set<string>): number {
    let inter = 0;
    for (const t of a) if (b.has(t)) inter++;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : inter / union;
  }
  const fpCandidates: { canonical: CanonicalRow; namesByStore: { store: string; name: string }[]; minJaccard: number }[] = [];
  for (const c of grouped) {
    const memberOfferProductIds = offers.filter((o) => o.canonical_product_id === c.id).map((o) => o.product_id);
    if (memberOfferProductIds.length < 2) continue;
    fpCandidates.push({ canonical: c, namesByStore: [], minJaccard: 1 }); // filled below via products lookup
  }
  // batch-fetch underlying products for offers in grouped canonical products (names only)
  const groupedCanonicalIds = new Set(grouped.map((c) => c.id));
  const offerProductIdsForGrouped = offers.filter((o) => o.canonical_product_id && groupedCanonicalIds.has(o.canonical_product_id));
  const productIdsNeeded = [...new Set(offerProductIdsForGrouped.map((o) => o.product_id))];
  const productNameById = new Map<string, string>();
  for (let i = 0; i < productIdsNeeded.length; i += 500) {
    const batch = productIdsNeeded.slice(i, i + 500);
    const { data } = await supabase.from("products").select("id, name").in("id", batch);
    for (const row of (data ?? []) as { id: string; name: string }[]) productNameById.set(row.id, row.name);
  }
  const fpResults: { canonical: CanonicalRow; pairs: { a: string; b: string; jaccard: number }[] }[] = [];
  for (const c of grouped) {
    const names = offers.filter((o) => o.canonical_product_id === c.id).map((o) => productNameById.get(o.product_id)).filter((n): n is string => !!n);
    const distinctNames = [...new Set(names)];
    if (distinctNames.length < 2) continue;
    let minJ = 1;
    const pairs: { a: string; b: string; jaccard: number }[] = [];
    for (let i = 0; i < distinctNames.length; i++) {
      for (let j = i + 1; j < distinctNames.length; j++) {
        const j1 = crudeJaccard(crudeTokenSet(distinctNames[i]), crudeTokenSet(distinctNames[j]));
        if (j1 < minJ) minJ = j1;
        pairs.push({ a: distinctNames[i], b: distinctNames[j], jaccard: j1 });
      }
    }
    if (minJ < 0.2) fpResults.push({ canonical: c, pairs: pairs.filter((p) => p.jaccard < 0.2) });
  }
  fpResults.sort((a, b) => Math.min(...a.pairs.map((p) => p.jaccard)) - Math.min(...b.pairs.map((p) => p.jaccard)));
  console.log(`  Candidatos encontrados (similaridade de tokens < 20% dentro do mesmo canonical product): ${fpResults.length}`);
  for (const r of fpResults.slice(0, 20)) {
    const worst = r.pairs.reduce((a, b) => (b.jaccard < a.jaccard ? b : a));
    console.log(`  canonical "${r.canonical.name}" (${r.canonical.id}): "${worst.a}" vs "${worst.b}" — similaridade de tokens ${(worst.jaccard * 100).toFixed(0)}%`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("FIM DA AUDITORIA — nenhuma escrita realizada.");
  console.log("=".repeat(80));
}

main().catch((err) => {
  console.error("[comparison-forensics-audit] Fatal:", err);
  process.exit(1);
});
