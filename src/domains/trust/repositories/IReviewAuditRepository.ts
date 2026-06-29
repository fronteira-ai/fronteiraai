import type { ReviewAuditRecord } from "../types/trust.types";

// INSERT-ONLY — no update or delete methods
export interface IReviewAuditRepository {
  findByReviewId(reviewId: string): Promise<ReviewAuditRecord[]>;
  findByMerchantId(merchantId: string, limit?: number): Promise<ReviewAuditRecord[]>;
  create(input: Omit<ReviewAuditRecord, "id" | "created_at">): Promise<ReviewAuditRecord | null>;
}
