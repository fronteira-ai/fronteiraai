import type { MerchantReviewRecord, ReviewStats, PaginatedResult, PaginationOptions } from "../types/trust.types";
import type { ReviewStatus } from "../types/enums";

export interface IMerchantReviewRepository {
  findByMerchantId(merchantId: string, options?: PaginationOptions & { status?: ReviewStatus }): Promise<PaginatedResult<MerchantReviewRecord>>;
  findById(id: string): Promise<MerchantReviewRecord | null>;
  findByReviewerAndMerchant(reviewerId: string, merchantId: string): Promise<MerchantReviewRecord | null>;
  create(input: Omit<MerchantReviewRecord, "id" | "created_at" | "edit_count" | "helpful_count" | "report_count" | "deleted_at">): Promise<MerchantReviewRecord | null>;
  update(id: string, patch: Partial<MerchantReviewRecord>): Promise<MerchantReviewRecord | null>;
  softDelete(id: string): Promise<boolean>;
  updateStatus(id: string, status: ReviewStatus): Promise<MerchantReviewRecord | null>;
  incrementHelpful(id: string): Promise<void>;
  incrementReports(id: string): Promise<void>;
  getStats(merchantId: string): Promise<ReviewStats>;
}
