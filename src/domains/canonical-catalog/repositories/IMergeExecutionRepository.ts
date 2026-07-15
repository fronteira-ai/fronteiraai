import type { MergeExecution } from "../domain/MergeExecution";
import type { MergeExecutionStatus } from "../types/enums";
import type { PaginatedResult, PaginationParams } from "../types/canonical-catalog.types";

export interface CreateMergeExecutionInput {
  mergeCandidateId: string;
  sourceCanonicalProductId: string;
  targetCanonicalProductId: string;
  movedOfferIds: string[];
  executedBy: string | null;
}

// Program Ω — Mission Ω-1 (Merge Execution Engine). Append-only audit log —
// the only mutation after creation is markRolledBack, never an update to
// the original executed_at/moved_offer_ids fields.
export interface IMergeExecutionRepository {
  create(input: CreateMergeExecutionInput): Promise<MergeExecution>;
  findById(id: string): Promise<MergeExecution | null>;
  findByCandidateId(mergeCandidateId: string): Promise<MergeExecution | null>;
  findByStatus(status: MergeExecutionStatus, pagination: PaginationParams): Promise<PaginatedResult<MergeExecution>>;
  markRolledBack(id: string, rolledBackBy: string | null): Promise<void>;
}
