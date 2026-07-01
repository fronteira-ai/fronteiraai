import type { ConfidenceTier, MatchStrategy } from "./enums";

// A product this domain doesn't own yet — connectors/ adapts its own
// NormalizedOffer shape into this before calling the engine/service. This
// domain never imports connectors/ types, enforcing the one-way dependency
// mandated by RELEASE_1_7_BLUEPRINT.md Chapter 8 (connectors depends on
// product-identity, never the reverse).
export interface EvaluableProduct {
  slug: string;
  name: string;
  brandSlug: string;
  categorySlug: string;
  specifications: Record<string, string>;
}

// An existing product considered as a possible match for an EvaluableProduct.
export interface MatchCandidate {
  productId: string;
  slug: string;
  name: string;
  brandSlug: string;
  categorySlug: string;
  specifications: Record<string, string>;
}

export interface MatchFactor {
  factor: string;
  matched: boolean;
  weight: number;
  evidence: string;
}

// A named deduction from an attribute's maximum possible contribution — e.g.
// specifications only partially overlapping, or the brand/category gate
// capping the whole score. Every point NOT awarded must trace to one of
// these, same as every point awarded traces to a MatchFactor.
export interface AttributePenalty {
  attribute: string;
  weightLost: number;
  reason: string;
}

export type SuggestedDecision = "auto-merge" | "review" | "new-product";

// CTO review (Wave 3 approval, post-implementation): every evaluation must be
// fully explainable, not just scoreable — this is Brain-facing data and a
// permanent strategic asset, not a debugging aid. algorithmVersion is
// mandatory on every result: historical MatchResults/log rows are never
// recalculated in place, so any future scoring change must ship as a new
// version, leaving old rows interpretable exactly as they were produced.
export interface MatchResult {
  candidateProductId: string | null;
  candidateProductSlug: string | null;
  confidence: number;
  tier: ConfidenceTier;
  strategy: MatchStrategy;
  factors: MatchFactor[];
  matchedAttributes: string[];
  mismatchedAttributes: string[];
  penalties: AttributePenalty[];
  suggestedDecision: SuggestedDecision;
  algorithmVersion: string;
  explainabilityReason: string;
}
