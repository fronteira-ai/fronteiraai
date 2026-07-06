import type { BuyerAlertCandidate, CreateBuyerAlertCandidateInput } from "../types";

export interface IBuyerAlertCandidateRepository {
  /**
   * Insert-if-absent by `rate_limit_key` (the table's unique index) — this
   * IS the rate limiting mechanism (Epic 8: "rate limiting" is a database
   * constraint, not an in-process cache that would miss across cron runs).
   * Returns null when the key already exists today (silently skipped, not
   * an error).
   */
  createIfNotRateLimited(input: CreateBuyerAlertCandidateInput): Promise<BuyerAlertCandidate | null>;
  listPending(limit: number): Promise<BuyerAlertCandidate[]>;
}
