import type { MergeCandidate } from "../domain/MergeCandidate";
import type { MergeCandidateStatus } from "../types/enums";
import type { PaginatedResult, PaginationParams } from "../types/canonical-catalog.types";

export interface CreateMergeCandidateInput {
  sourceCanonicalProductId: string;
  targetCanonicalProductId: string;
  confidence: number;
  algorithmVersion: string;
  matchedAttributes: string[];
  mismatchedAttributes: string[];
  penalties: MergeCandidate["penalties"];
  reason: string;
}

// CTO mission: "Nenhuma união automática. Toda união deverá ser apenas
// sugerida." — deliberately no method here that reassigns offers or
// deprecates a canonical product. updateStatus only ever records a human
// decision (approved/rejected/ignored); executing an approved merge is a
// future Wave's capability, not this repository's.
export interface IMergeCandidateRepository {
  create(input: CreateMergeCandidateInput): Promise<MergeCandidate>;
  findById(id: string): Promise<MergeCandidate | null>;
  findByStatus(status: MergeCandidateStatus, pagination: PaginationParams): Promise<PaginatedResult<MergeCandidate>>;
  /** Read-only helper used to avoid writing duplicate suggestions for the same pair. */
  findByPair(sourceCanonicalProductId: string, targetCanonicalProductId: string): Promise<MergeCandidate | null>;
  updateStatus(id: string, status: MergeCandidateStatus, reviewedBy: string | null): Promise<void>;
}
