// Release 1.7 — Wave 3 — Product Identity Engine (Shadow Mode).
// Thresholds approved by the CTO (RELEASE_1_7_BLUEPRINT.md Chapter 8): they
// may move as the algorithm is validated against real Shadow Mode data, but
// every decision must stay traceable to a named tier, never a raw number.

export enum MatchStrategy {
  ExactSlug = "exact-slug",
  FuzzyAttribute = "fuzzy-attribute",
}

export enum ConfidenceTier {
  Auto = "auto",
  Probable = "probable",
  Possible = "possible",
  NewProduct = "new_product",
}

export const CONFIDENCE_THRESHOLDS = {
  auto: 95,
  probable: 85,
  possible: 70,
} as const;

export function tierForConfidence(confidence: number): ConfidenceTier {
  if (confidence >= CONFIDENCE_THRESHOLDS.auto) return ConfidenceTier.Auto;
  if (confidence >= CONFIDENCE_THRESHOLDS.probable) return ConfidenceTier.Probable;
  if (confidence >= CONFIDENCE_THRESHOLDS.possible) return ConfidenceTier.Possible;
  return ConfidenceTier.NewProduct;
}

// CTO review (Wave 3 approval): every future scoring change bumps this.
// Match log rows are append-only and carry the version they were produced
// under — a past evaluation is never recalculated in place, so this string
// is what makes an old row interpretable after the algorithm evolves.
export const PRODUCT_IDENTITY_ALGORITHM_VERSION = "1.0.0";
