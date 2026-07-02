// Release 1.7 — Wave 4 — Canonical Catalog & Compare Foundation.
// Shadow Mode continues at the canonical level (CTO mission): a
// MergeCandidate's status only ever records a human decision. Nothing in
// this domain reassigns offers or deprecates a canonical product based on
// status — that execution is explicitly out of scope for this Wave.

export enum MergeCandidateStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
  Ignored = "ignored",
}
