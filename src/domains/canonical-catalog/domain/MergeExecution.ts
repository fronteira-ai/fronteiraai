import type { MergeExecutionStatus } from "../types/enums";

// Program Ω — Mission Ω-1 (Merge Execution Engine). Append-only audit log of
// every real merge performed. `movedOfferIds` is the exact set of offers
// this execution repointed — never re-derived from "offers currently on
// target", because a later execution can move more offers into the same
// target, which would make that inference wrong. Rollback replays this
// exact list, nothing else.
export interface MergeExecution {
  id: string;
  mergeCandidateId: string;
  sourceCanonicalProductId: string;
  targetCanonicalProductId: string;
  movedOfferIds: string[];
  status: MergeExecutionStatus;
  executedAt: string;
  executedBy: string | null;
  rolledBackAt: string | null;
  rolledBackBy: string | null;
}
