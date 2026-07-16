import type {
  CanonicalProduct,
  ICanonicalCatalogRepository,
  IMergeCandidateRepository,
} from "@/src/domains/canonical-catalog";
import { findNodeByRealCategorySlug } from "@/src/domains/taxonomy";
import { buildProductSignature, type ProductSignature } from "@/src/domains/product-intelligence";
import { ProductIdentityEngine } from "../domain/ProductIdentityEngine";
import { CONFIDENCE_THRESHOLDS } from "../types/enums";
import type { EvaluableProduct, MatchCandidate } from "../types/product-identity.types";

// The one bridge between the two domains (mission objective 15): lives in
// product-identity/, which is allowed to depend down into canonical-catalog/,
// taxonomy/ and product-intelligence/ — never the reverse. None of those
// three domains has any idea this service exists.
//
// Program Κ — Mission Κ-4 (Product Identity Integration): both the category
// gate and the specifications factor below now read from Κ-2/Κ-3's output
// instead of raw canonical_products columns. ProductIdentityEngine itself
// is untouched — same file, same weights, same thresholds — only what is
// handed to it changed, per Κ-3's own design note ("substitui O QUE é
// passado para esse campo — nunca COMO ele é comparado").

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

function toEvaluableProduct(canonical: CanonicalProduct, categorySlug: string): EvaluableProduct {
  const signature = buildProductSignature({
    id: canonical.id,
    name: canonical.name,
    brandName: null,
    specifications: canonical.specifications,
  });
  return {
    slug: canonical.canonicalSlug,
    name: canonical.name,
    brandSlug: canonical.brandId ?? "",
    categorySlug,
    specifications: signatureToSpecifications(signature),
  };
}

function toMatchCandidate(canonical: CanonicalProduct, categorySlug: string): MatchCandidate {
  const signature = buildProductSignature({
    id: canonical.id,
    name: canonical.name,
    brandName: null,
    specifications: canonical.specifications,
  });
  return {
    productId: canonical.id,
    slug: canonical.canonicalSlug,
    name: canonical.name,
    brandSlug: canonical.brandId ?? "",
    categorySlug,
    specifications: signatureToSpecifications(signature),
  };
}

export class CanonicalMergeSuggestionService {
  private readonly engine = new ProductIdentityEngine();

  constructor(
    private readonly catalogRepo: ICanonicalCatalogRepository,
    private readonly mergeCandidateRepo: IMergeCandidateRepository
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
    const evaluableSource = toEvaluableProduct(source, sourceCategorySlug);
    const matchCandidates = candidates.map((c) =>
      toMatchCandidate(c, resolveCategoryGateSlug(c.categoryId, c.categoryId ? realSlugsById.get(c.categoryId) : undefined))
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
