// Release 1.7 — Wave 4 — Canonical Catalog & Compare Foundation.
// Shadow Mode continues at the canonical level (CTO mission): a
// MergeCandidate's status only ever records a human decision. Nothing in
// this domain reassigns offers or deprecates a canonical product based on
// status — that execution is explicitly out of scope for this Wave.

// Program Ω — Mission Ω-1 (Merge Execution Engine): Merged/RolledBack close
// the queue's lifecycle (Pending → Approved → Merged, or → Rejected, or
// Merged → RolledBack). "Approved" still only records a human decision —
// the Shadow Mode invariant above is unchanged; execution is a distinct,
// explicit second step (MergeExecutorService.execute), never automatic.
export enum MergeCandidateStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
  Ignored = "ignored",
  Merged = "merged",
  RolledBack = "rolled_back",
}

export enum MergeExecutionStatus {
  Executed = "executed",
  RolledBack = "rolled_back",
}
