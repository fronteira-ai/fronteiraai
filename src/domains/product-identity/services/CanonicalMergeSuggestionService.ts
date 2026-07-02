import type {
  CanonicalProduct,
  ICanonicalCatalogRepository,
  IMergeCandidateRepository,
} from "@/src/domains/canonical-catalog";
import { ProductIdentityEngine } from "../domain/ProductIdentityEngine";
import { CONFIDENCE_THRESHOLDS } from "../types/enums";
import type { EvaluableProduct, MatchCandidate } from "../types/product-identity.types";

// The one bridge between the two domains (mission objective 15): lives in
// product-identity/, which is allowed to depend down into canonical-catalog/
// — never the reverse. canonical-catalog/ has no idea this service exists.
//
// canonical_products carry brandId/categoryId (UUIDs), not the human-readable
// brandSlug/categorySlug the engine's gates were designed around — UUID
// equality is just as valid for the gate itself (same id = same brand/
// category, regardless of readability), so they're passed through as-is.
// The trade-off: a MergeCandidate's `matched`/`mismatched` evidence text for
// those two factors shows raw ids, not names — acceptable for Shadow Mode
// audit data, not shown to end users.
function toEvaluableProduct(canonical: CanonicalProduct): EvaluableProduct {
  return {
    slug: canonical.canonicalSlug,
    name: canonical.name,
    brandSlug: canonical.brandId ?? "",
    categorySlug: canonical.categoryId ?? "",
    specifications: canonical.specifications ?? {},
  };
}

function toMatchCandidate(canonical: CanonicalProduct): MatchCandidate {
  return {
    productId: canonical.id,
    slug: canonical.canonicalSlug,
    name: canonical.name,
    brandSlug: canonical.brandId ?? "",
    categorySlug: canonical.categoryId ?? "",
    specifications: canonical.specifications ?? {},
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

    const result = this.engine.evaluate(toEvaluableProduct(source), candidates.map(toMatchCandidate));

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
