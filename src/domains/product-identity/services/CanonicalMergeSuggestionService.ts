import type {
  CanonicalProduct,
  ICanonicalCatalogRepository,
  IMergeCandidateRepository,
} from "@/src/domains/canonical-catalog";
import { findNodeByRealCategorySlug } from "@/src/domains/taxonomy";
import { buildProductSignature, type ProductSignature } from "@/src/domains/product-intelligence";
import {
  FactType,
  MARKETPLACE_MEMORY_ALGORITHM_VERSION,
  MarketplaceMemoryService,
  factsFromProductSignature,
  type LearnedFact,
} from "@/src/domains/marketplace-memory";
import { ProductIdentityEngine } from "../domain/ProductIdentityEngine";
import { CONFIDENCE_THRESHOLDS } from "../types/enums";
import type { EvaluableProduct, MatchCandidate } from "../types/product-identity.types";

// The one bridge between the two domains (mission objective 15): lives in
// product-identity/, which is allowed to depend down into canonical-catalog/,
// taxonomy/, product-intelligence/ and — as of Program Ω Mission Ω-3 —
// marketplace-memory/. Never the reverse. None of those four domains has
// any idea this service exists.
//
// Program Κ — Mission Κ-4 (Product Identity Integration): both the category
// gate and the specifications factor below now read from Κ-2/Κ-3's output
// instead of raw canonical_products columns. ProductIdentityEngine itself
// is untouched — same file, same weights, same thresholds — only what is
// handed to it changed, per Κ-3's own design note ("substitui O QUE é
// passado para esse campo — nunca COMO ele é comparado").
//
// Program Ω — Mission Ω-3 (Product Identity Read-Through Integration):
// specifications can now be read from Marketplace Memory instead of
// recomputed via buildProductSignature — same discipline again: WHAT
// feeds the Engine changes, the Engine and ProductIdentityEngine.ts do
// not. Feature-flagged (PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT, default
// 0 — inert unless explicitly raised), always falls back to the original
// compute-fresh path on any read failure, and — while the flag is above
// 0% — samples continuous parity checks between the reused and
// recomputed value (PRODUCT_IDENTITY_MEMORY_PARITY_SAMPLE_PERCENT,
// default 100), preferring the freshly-computed value whenever they
// disagree. See docs/architecture/PRODUCT_IDENTITY_READ_THROUGH.md.

// Category gate: canonical_products.categoryId is a UUID, not the slug the
// Universal Taxonomy tree keys on (`realCategorySlugs`). Resolve id -> real
// `categories.slug` (batch lookup), then real slug -> Universal node slug
// where Κ-2 already mapped one. Two canonical products in different raw
// categories that both roll up to the same Universal node now pass the
// gate — the entire point of wiring the taxonomy in.
//
// Fallback discipline matters here: if the batch lookup didn't return a
// slug for this categoryId (lookup failure, or a category row deleted
// after the FK was set), falling back to "" would be wrong — it would
// make every canonical product with an unresolved category collapse onto
// the same gate value and start spuriously matching each other. Falling
// back to the raw categoryId instead reproduces the exact old
// UUID-equality behavior for that row (a UUID never coincidentally equals
// a real category slug, so findNodeByRealCategorySlug simply won't match
// and the id passes through as its own distinct gate value, same as
// before this Mission). Only a genuinely absent category (categoryId
// itself null) still gates on "".
function resolveCategoryGateSlug(categoryId: string | null, realSlug: string | undefined): string {
  if (!categoryId) return "";
  const effectiveSlug = realSlug ?? categoryId;
  const universalNode = findNodeByRealCategorySlug(effectiveSlug);
  return universalNode?.slug ?? effectiveSlug;
}

// Specifications factor: replaces the raw, fragmented `specifications`
// column (323 distinct keys in production, e.g. "COR"/"Color"/"cor" never
// overlapping) with the normalized ProductSignature Κ-3 already built and
// validated by simulation. Only non-null fields are included — an absent
// key is honest ("not extracted"), never a guessed empty string, and the
// Engine's specOverlap only scores keys present on both sides anyway.
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

// ── Program Ω — Mission Ω-3: Read-Through, Feature Flag, Observability ──

// FactType (marketplace-memory, snake_case DB values, e.g.
// "manufacturer_code") never equals the camelCase key
// signatureToSpecifications writes (e.g. "manufacturerCode"). A naive
// pass-through here would silently desync: a fresh-computed product and a
// Memory-sourced one would carry DIFFERENT keys for the same concept, and
// ProductIdentityEngine's specOverlap (a union-of-keys comparison) would
// treat them as two unrelated attributes instead of a match — a subtle,
// silent correctness break this map exists specifically to prevent.
const FACT_TYPE_TO_SPEC_KEY: Partial<Record<FactType, keyof ProductSignature | string>> = {
  [FactType.Model]: "model",
  [FactType.Color]: "color",
  [FactType.CapacityGb]: "capacityGb",
  [FactType.RamGb]: "ramGb",
  [FactType.ScreenSizeIn]: "screenSizeIn",
  [FactType.Processor]: "processor",
  [FactType.Gpu]: "gpu",
  [FactType.Voltage]: "voltage",
  [FactType.PowerW]: "powerW",
  [FactType.Ean]: "ean",
  [FactType.ManufacturerCode]: "manufacturerCode",
  [FactType.BundleIncludes]: "bundleIncludes",
};

export const readThroughMetrics = {
  reads: 0,
  hits: 0,
  misses: 0,
  fallbacks: 0,
  parityChecks: 0,
  parityErrors: 0,
};

/** Test-only reset — production code never calls this. */
export function resetReadThroughMetricsForTests(): void {
  readThroughMetrics.reads = 0;
  readThroughMetrics.hits = 0;
  readThroughMetrics.misses = 0;
  readThroughMetrics.fallbacks = 0;
  readThroughMetrics.parityChecks = 0;
  readThroughMetrics.parityErrors = 0;
}

// Env vars, read at CALL time (never cached in a module-level constant) so
// an operator can change rollout without a redeploy — Objetivo 7's exact
// requirement. Default 0 (Objetivo 1/Quality Gate: "zero regressões" out
// of the box; explicit opt-in required to change any behavior at all).
function rolloutPercent(): number {
  const raw = process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT;
  const parsed = raw !== undefined ? parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0;
}

function paritySamplePercent(): number {
  const raw = process.env.PRODUCT_IDENTITY_MEMORY_PARITY_SAMPLE_PERCENT;
  const parsed = raw !== undefined ? parseInt(raw, 10) : 100;
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 100;
}

// Deterministic per-key bucket (0-99) — the same canonical_product_id
// always lands on the same side of the rollout percentage across calls
// and deploys. A per-call coin flip would make hit/miss behavior
// nondeterministic and unauditable; this makes "which products are in
// the rollout" a reproducible, inspectable fact.
function bucketFor(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return hash % 100;
}

function specsEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => a[k] === b[k]);
}

/** Converts persisted facts into the exact same shape signatureToSpecifications
 * produces. Filters out anything not safe to reuse: invalidated facts,
 * and facts written by an older extraction algorithm version ("registro
 * expirado"/"algoritmo atualizado", Objetivo 6) — both fall through to a
 * fresh computation exactly as a genuine cache miss would, self-healing
 * on the next write-back. Returns null (never an empty object) when
 * nothing usable was found, so callers can't mistake "no facts" for "an
 * empty but valid specifications record". */
function factsToSpecifications(facts: LearnedFact[]): Record<string, string> | null {
  const spec: Record<string, string> = {};
  let any = false;
  for (const fact of facts) {
    if (fact.validationStatus === "invalidated") continue; // "registro corrompido"
    if (fact.algorithmVersion !== MARKETPLACE_MEMORY_ALGORITHM_VERSION) continue; // "expirado"/"algoritmo atualizado"
    const key = FACT_TYPE_TO_SPEC_KEY[fact.factType];
    if (!key) continue; // category/brand/family/line/tokens are not part of `specifications`
    spec[key] = fact.factValue;
    any = true;
  }
  return any ? spec : null;
}

function computeSignatureAndSpecifications(canonical: CanonicalProduct): { signature: ProductSignature; spec: Record<string, string> } {
  const signature = buildProductSignature({
    id: canonical.id,
    name: canonical.name,
    brandName: null,
    specifications: canonical.specifications,
  });
  return { signature, spec: signatureToSpecifications(signature) };
}

/** Objetivo 1/2/3/6: the read-through flow. Consult Memory -> valid fact
 * found -> reuse (sampled parity check while the flag is above 0%,
 * preferring the fresh value on any disagreement) -> otherwise, or on ANY
 * read failure of any kind, run the original pipeline unchanged, persist
 * the result best-effort, and return normally. The function's return
 * value is indistinguishable to the caller regardless of which path was
 * taken — "nenhum comportamento funcional poderá mudar" holds by
 * construction, not by convention. */
async function getSpecificationsReadThrough(
  canonical: CanonicalProduct,
  memoryService: MarketplaceMemoryService | null
): Promise<Record<string, string>> {
  if (!memoryService || bucketFor(canonical.id) >= rolloutPercent()) {
    return computeSignatureAndSpecifications(canonical).spec;
  }

  readThroughMetrics.reads++;

  let facts: LearnedFact[];
  try {
    facts = await memoryService.getFactsForProduct(canonical.id);
  } catch (err) {
    // Objetivo 2: any read failure -> old pipeline, silently, never
    // interrupts Product Identity.
    readThroughMetrics.fallbacks++;
    console.error(`[CanonicalMergeSuggestionService] Marketplace Memory read failed for ${canonical.id}, falling back:`, String(err));
    return computeSignatureAndSpecifications(canonical).spec;
  }

  const reused = factsToSpecifications(facts);

  if (reused === null) {
    // Miss: run current pipeline, persist result, return normally.
    readThroughMetrics.misses++;
    const { signature, spec } = computeSignatureAndSpecifications(canonical);
    try {
      const newFacts = factsFromProductSignature(canonical.id, signature, null);
      if (newFacts.length > 0) await memoryService.learnFacts(newFacts);
    } catch (err) {
      // Best-effort write-back — a failed persist never blocks the read
      // path; the next miss will simply try again.
      console.error(`[CanonicalMergeSuggestionService] Marketplace Memory write-back failed for ${canonical.id}:`, String(err));
    }
    return spec;
  }

  readThroughMetrics.hits++;

  // Objetivo 3: continuous parity validation "enquanto durar a fase
  // inicial" — sampled (default 100%, tunable via env var without a
  // redeploy), never silent when it disagrees.
  if (bucketFor(`${canonical.id}:parity`) < paritySamplePercent()) {
    readThroughMetrics.parityChecks++;
    const fresh = computeSignatureAndSpecifications(canonical).spec;
    if (!specsEqual(reused, fresh)) {
      readThroughMetrics.parityErrors++;
      console.error(`[CanonicalMergeSuggestionService] Marketplace Memory parity error for ${canonical.id}:`, { reused, fresh });
      return fresh; // safety-first: a divergent cached value is never trusted
    }
  }

  return reused;
}

async function toEvaluableProduct(
  canonical: CanonicalProduct,
  categorySlug: string,
  memoryService: MarketplaceMemoryService | null
): Promise<EvaluableProduct> {
  return {
    slug: canonical.canonicalSlug,
    name: canonical.name,
    brandSlug: canonical.brandId ?? "",
    categorySlug,
    specifications: await getSpecificationsReadThrough(canonical, memoryService),
  };
}

async function toMatchCandidate(
  canonical: CanonicalProduct,
  categorySlug: string,
  memoryService: MarketplaceMemoryService | null
): Promise<MatchCandidate> {
  return {
    productId: canonical.id,
    slug: canonical.canonicalSlug,
    name: canonical.name,
    brandSlug: canonical.brandId ?? "",
    categorySlug,
    specifications: await getSpecificationsReadThrough(canonical, memoryService),
  };
}

export class CanonicalMergeSuggestionService {
  private readonly engine = new ProductIdentityEngine();

  constructor(
    private readonly catalogRepo: ICanonicalCatalogRepository,
    private readonly mergeCandidateRepo: IMergeCandidateRepository,
    // Program Ω — Mission Ω-3. Optional and defaulting to null so every
    // existing caller (scripts, tests, the 2-arg factory usage from
    // before this Mission) is byte-identical in behavior — read-through
    // only activates when a caller explicitly passes a MarketplaceMemoryService
    // AND the rollout percent env var is above 0.
    private readonly memoryService: MarketplaceMemoryService | null = null
  ) {}

  // Evaluates one canonical product against every other canonical product of
  // the same brand and, if the best match reaches at least the "possible"
  // tier, writes a single pending MergeCandidate — always a suggestion,
  // never an automatic union (CTO mission). No-ops (does not throw) when
  // there's nothing to compare or a suggestion for this pair already exists.
  async suggestMergesFor(canonicalProductId: string): Promise<void> {
    const source = await this.catalogRepo.findById(canonicalProductId);
    if (!source || !source.brandId) return;

    const candidates = (await this.catalogRepo.findByBrandId(source.brandId)).filter((c) => c.id !== source.id);
    if (candidates.length === 0) return;

    const categoryIds = [source.categoryId, ...candidates.map((c) => c.categoryId)].filter(
      (id): id is string => id !== null
    );
    const realSlugsById = await this.catalogRepo.findCategorySlugsByIds(categoryIds);

    const sourceCategorySlug = resolveCategoryGateSlug(
      source.categoryId,
      source.categoryId ? realSlugsById.get(source.categoryId) : undefined
    );
    const evaluableSource = await toEvaluableProduct(source, sourceCategorySlug, this.memoryService);
    const matchCandidates = await Promise.all(
      candidates.map((c) =>
        toMatchCandidate(c, resolveCategoryGateSlug(c.categoryId, c.categoryId ? realSlugsById.get(c.categoryId) : undefined), this.memoryService)
      )
    );

    const result = this.engine.evaluate(evaluableSource, matchCandidates);

    if (result.confidence < CONFIDENCE_THRESHOLDS.possible) return;
    if (!result.candidateProductId || result.candidateProductId === source.id) return;

    const existing = await this.mergeCandidateRepo.findByPair(source.id, result.candidateProductId);
    if (existing) return;

    await this.mergeCandidateRepo.create({
      sourceCanonicalProductId: source.id,
      targetCanonicalProductId: result.candidateProductId,
      confidence: result.confidence,
      algorithmVersion: result.algorithmVersion,
      matchedAttributes: result.matchedAttributes,
      mismatchedAttributes: result.mismatchedAttributes,
      penalties: result.penalties,
      reason: result.explainabilityReason,
    });
  }
}
