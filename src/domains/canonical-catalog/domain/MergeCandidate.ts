import type { MergeCandidateStatus } from "../types/enums";

// Deliberately duplicated from product-identity/types/product-identity.types.ts's
// AttributePenalty shape rather than imported — canonical-catalog/ must never
// depend on product-identity/ (mission, objective 15). Whoever produces a
// MergeCandidate (product-identity's CanonicalMergeSuggestionService) maps
// its own richer types into this shape at the boundary.
export interface MergeCandidatePenalty {
  attribute: string;
  weightLost: number;
  reason: string;
}

// A suggestion that two CanonicalProducts might be the same real-world
// product. Always a suggestion (CTO mission: "Nenhuma união automática. Toda
// união deverá ser apenas sugerida.") — even `status: Approved` only records
// a human decision. Nothing reassigns offers or deprecates a canonical
// product based on this status; that execution is out of scope for this
// Wave, by construction (see IMergeCandidateRepository — no such method
// exists).
export interface MergeCandidate {
  id: string;
  sourceCanonicalProductId: string;
  targetCanonicalProductId: string;
  confidence: number;
  algorithmVersion: string;
  matchedAttributes: string[];
  mismatchedAttributes: string[];
  penalties: MergeCandidatePenalty[];
  reason: string;
  status: MergeCandidateStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
}
