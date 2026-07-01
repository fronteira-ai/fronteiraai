import { ConfidenceTier, MatchStrategy, PRODUCT_IDENTITY_ALGORITHM_VERSION, tierForConfidence } from "../types/enums";
import type {
  AttributePenalty,
  EvaluableProduct,
  MatchCandidate,
  MatchFactor,
  MatchResult,
  SuggestedDecision,
} from "../types/product-identity.types";

// Conservative by design (CTO approval, RELEASE_1_7_BLUEPRINT.md Chapter 8):
// false positive (merging two different products) is unacceptable; false
// negative (leaving a duplicate unmerged) is acceptable and fixable later.
// Brand and category are hard gates — a mismatch on either caps the score
// well below any mergeable tier, no matter how similar the name/specs look.
const MISMATCH_CAP = 40;

const NAME_WEIGHT = 50;
const SPEC_WEIGHT = 30;
const MODEL_WEIGHT = 20;

// Maximum contribution per scored (non-gate) factor — used to derive
// penalties (CTO review): the gap between what a factor could have
// contributed and what it actually did.
const FACTOR_MAX_WEIGHT: Record<string, number> = {
  "name-similarity": NAME_WEIGHT,
  specifications: SPEC_WEIGHT,
  "model-number": MODEL_WEIGHT,
};

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function specOverlap(a: Record<string, string>, b: Record<string, string>): { matched: number; compared: number } {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let matched = 0;
  let compared = 0;
  for (const key of keys) {
    if (!(key in a) || !(key in b)) continue;
    compared++;
    if (a[key].trim().toLowerCase() === b[key].trim().toLowerCase()) matched++;
  }
  return { matched, compared };
}

// Every factor is recorded regardless of whether it moved the score — this is
// what "explainability" means operationally (CTO approval): a match, or a
// non-match, always traces to named factors, never an opaque number.
function scoreCandidate(offer: EvaluableProduct, candidate: MatchCandidate): MatchFactor[] {
  const factors: MatchFactor[] = [];

  const brandMatches = offer.brandSlug === candidate.brandSlug;
  factors.push({
    factor: "brand",
    matched: brandMatches,
    weight: 0,
    evidence: brandMatches
      ? `brand slug "${offer.brandSlug}" matches`
      : `brand slug "${offer.brandSlug}" differs from candidate "${candidate.brandSlug}"`,
  });

  const categoryMatches = offer.categorySlug === candidate.categorySlug;
  factors.push({
    factor: "category",
    matched: categoryMatches,
    weight: 0,
    evidence: categoryMatches
      ? `category slug "${offer.categorySlug}" matches`
      : `category slug "${offer.categorySlug}" differs from candidate "${candidate.categorySlug}"`,
  });

  const offerTokens = tokenize(offer.name);
  const candidateTokens = tokenize(candidate.name);
  const nameSimilarity = jaccardSimilarity(offerTokens, candidateTokens);
  factors.push({
    factor: "name-similarity",
    matched: nameSimilarity >= 0.5,
    weight: Math.round(nameSimilarity * NAME_WEIGHT),
    evidence: `token similarity ${(nameSimilarity * 100).toFixed(0)}% between "${offer.name}" and "${candidate.name}"`,
  });

  const { matched: specMatched, compared: specCompared } = specOverlap(offer.specifications, candidate.specifications);
  const specScore = specCompared > 0 ? (specMatched / specCompared) * SPEC_WEIGHT : 0;
  factors.push({
    factor: "specifications",
    matched: specCompared > 0 && specMatched === specCompared,
    weight: Math.round(specScore),
    evidence:
      specCompared > 0
        ? `${specMatched}/${specCompared} shared specification keys match`
        : "no comparable specification keys",
  });

  const offerModelTokens = offerTokens.filter((token) => /\d/.test(token));
  const candidateModelTokenSet = new Set(candidateTokens.filter((token) => /\d/.test(token)));
  const sharedModelTokens = offerModelTokens.filter((token) => candidateModelTokenSet.has(token));
  const modelRatio = offerModelTokens.length > 0 ? sharedModelTokens.length / offerModelTokens.length : 0;
  factors.push({
    factor: "model-number",
    matched: offerModelTokens.length > 0 && sharedModelTokens.length === offerModelTokens.length,
    weight: Math.round(modelRatio * MODEL_WEIGHT),
    evidence:
      offerModelTokens.length > 0
        ? `${sharedModelTokens.length}/${offerModelTokens.length} alphanumeric model tokens shared (${sharedModelTokens.join(", ") || "none"})`
        : "no alphanumeric model tokens found in offer name",
  });

  return factors;
}

function confidenceFromFactors(offer: EvaluableProduct, candidate: MatchCandidate, factors: MatchFactor[]): number {
  const rawScore = factors.reduce((sum, factor) => sum + factor.weight, 0);
  const gatesPassed = offer.brandSlug === candidate.brandSlug && offer.categorySlug === candidate.categorySlug;
  return gatesPassed ? Math.min(100, rawScore) : Math.min(rawScore, MISMATCH_CAP);
}

function attributesFromFactors(factors: MatchFactor[]): { matched: string[]; mismatched: string[] } {
  const matched: string[] = [];
  const mismatched: string[] = [];
  for (const factor of factors) {
    (factor.matched ? matched : mismatched).push(factor.factor);
  }
  return { matched, mismatched };
}

// CTO review: every point NOT awarded must trace to a named penalty, same as
// every point awarded traces to a MatchFactor. Two sources of penalty: a
// scored factor falling short of its maximum possible weight, and the
// brand/category gate capping the whole score when either mismatches.
function buildPenalties(factors: MatchFactor[], gatesPassed: boolean, rawScore: number, confidence: number): AttributePenalty[] {
  const penalties: AttributePenalty[] = [];

  for (const factor of factors) {
    const maxWeight = FACTOR_MAX_WEIGHT[factor.factor];
    if (maxWeight !== undefined && factor.weight < maxWeight) {
      penalties.push({
        attribute: factor.factor,
        weightLost: maxWeight - factor.weight,
        reason: factor.evidence,
      });
    }
  }

  if (!gatesPassed) {
    penalties.push({
      attribute: "brand-category-gate",
      weightLost: Math.max(0, rawScore - confidence),
      reason: `brand and/or category mismatch caps confidence at ${MISMATCH_CAP} regardless of the raw score (${rawScore})`,
    });
  }

  return penalties;
}

function buildExplainabilityReason(
  offer: EvaluableProduct,
  candidate: MatchCandidate,
  factors: MatchFactor[],
  gatesPassed: boolean,
  confidence: number,
  tier: ConfidenceTier
): string {
  const { matched, mismatched } = attributesFromFactors(factors);
  const parts: string[] = [
    `Compared offer "${offer.name}" to candidate "${candidate.name}" (${candidate.productId}).`,
  ];
  if (matched.length > 0) parts.push(`Matched attributes: ${matched.join(", ")}.`);
  if (mismatched.length > 0) parts.push(`Mismatched attributes: ${mismatched.join(", ")}.`);
  if (!gatesPassed) {
    parts.push(`Brand/category gate failed, so confidence was capped at ${MISMATCH_CAP} regardless of other similarity.`);
  }
  parts.push(`Final confidence ${confidence} -> tier "${tier}".`);
  return parts.join(" ");
}

function suggestedDecisionFor(tier: ConfidenceTier): SuggestedDecision {
  switch (tier) {
    case ConfidenceTier.Auto:
      return "auto-merge";
    case ConfidenceTier.Probable:
    case ConfidenceTier.Possible:
      return "review";
    default:
      return "new-product";
  }
}

export class ProductIdentityEngine {
  evaluate(offer: EvaluableProduct, candidates: MatchCandidate[]): MatchResult {
    const exactSlugCandidate = candidates.find((candidate) => candidate.slug === offer.slug);
    if (exactSlugCandidate) {
      return {
        candidateProductId: exactSlugCandidate.productId,
        candidateProductSlug: exactSlugCandidate.slug,
        confidence: 100,
        tier: ConfidenceTier.Auto,
        strategy: MatchStrategy.ExactSlug,
        factors: [{ factor: "slug", matched: true, weight: 100, evidence: `exact slug match "${offer.slug}"` }],
        matchedAttributes: ["slug"],
        mismatchedAttributes: [],
        penalties: [],
        suggestedDecision: "auto-merge",
        algorithmVersion: PRODUCT_IDENTITY_ALGORITHM_VERSION,
        explainabilityReason: `Exact slug match "${offer.slug}" — certain identity, no fuzzy scoring performed.`,
      };
    }

    if (candidates.length === 0) {
      return {
        candidateProductId: null,
        candidateProductSlug: null,
        confidence: 0,
        tier: ConfidenceTier.NewProduct,
        strategy: MatchStrategy.FuzzyAttribute,
        factors: [
          { factor: "candidates", matched: false, weight: 0, evidence: "no candidate products found for this brand" },
        ],
        matchedAttributes: [],
        mismatchedAttributes: ["candidates"],
        penalties: [],
        suggestedDecision: "new-product",
        algorithmVersion: PRODUCT_IDENTITY_ALGORITHM_VERSION,
        explainabilityReason: `No candidate products found for brand "${offer.brandSlug}" — classified as a new product.`,
      };
    }

    let best: {
      candidate: MatchCandidate;
      confidence: number;
      rawScore: number;
      gatesPassed: boolean;
      factors: MatchFactor[];
    } | null = null;

    for (const candidate of candidates) {
      const factors = scoreCandidate(offer, candidate);
      const rawScore = factors.reduce((sum, factor) => sum + factor.weight, 0);
      const gatesPassed = offer.brandSlug === candidate.brandSlug && offer.categorySlug === candidate.categorySlug;
      const confidence = confidenceFromFactors(offer, candidate, factors);
      if (!best || confidence > best.confidence) {
        best = { candidate, confidence, rawScore, gatesPassed, factors };
      }
    }

    const { candidate, confidence, rawScore, gatesPassed, factors } = best as NonNullable<typeof best>;
    const tier = tierForConfidence(confidence);
    const { matched, mismatched } = attributesFromFactors(factors);

    return {
      candidateProductId: confidence > 0 ? candidate.productId : null,
      candidateProductSlug: confidence > 0 ? candidate.slug : null,
      confidence,
      tier,
      strategy: MatchStrategy.FuzzyAttribute,
      factors,
      matchedAttributes: matched,
      mismatchedAttributes: mismatched,
      penalties: buildPenalties(factors, gatesPassed, rawScore, confidence),
      suggestedDecision: suggestedDecisionFor(tier),
      algorithmVersion: PRODUCT_IDENTITY_ALGORITHM_VERSION,
      explainabilityReason: buildExplainabilityReason(offer, candidate, factors, gatesPassed, confidence, tier),
    };
  }
}
