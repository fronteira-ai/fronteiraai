import type { ReviewReportRecord, PaginatedResult, PaginationOptions } from "../types/trust.types";
import type { ReviewReportStatus } from "../types/enums";

export interface IReviewReportRepository {
  findByReviewId(reviewId: string): Promise<ReviewReportRecord[]>;
  findPending(options?: PaginationOptions): Promise<PaginatedResult<ReviewReportRecord>>;
  findById(id: string): Promise<ReviewReportRecord | null>;
  findByReporterAndReview(reporterId: string, reviewId: string): Promise<ReviewReportRecord | null>;
  create(input: Omit<ReviewReportRecord, "id" | "created_at" | "reviewed_by" | "reviewed_at" | "action_taken">): Promise<ReviewReportRecord | null>;
  updateStatus(id: string, status: ReviewReportStatus, reviewedBy: string, actionTaken?: string): Promise<ReviewReportRecord | null>;
}
