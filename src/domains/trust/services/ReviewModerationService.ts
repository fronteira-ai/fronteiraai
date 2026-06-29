import type { IMerchantReviewRepository } from "../repositories/IMerchantReviewRepository";
import type { IReviewReportRepository } from "../repositories/IReviewReportRepository";
import type { IReviewAuditRepository } from "../repositories/IReviewAuditRepository";
import type { ITrustEventRepository } from "../repositories/ITrustEventRepository";
import type { IMerchantTimelineRepository } from "../repositories/IMerchantTimelineRepository";
import type { MerchantReviewRecord, ReviewReportRecord, PaginatedResult, PaginationOptions } from "../types/trust.types";
import {
  ReviewStatus,
  ReviewAction,
  ReviewReportReason,
  ReviewReportStatus,
  TrustEventType,
  TrustSource,
  TimelineEventType,
  TimelineEventCategory,
  TimelineVisibility,
} from "../types/enums";

export type ModerationAction = "approve" | "hide" | "remove" | "restore";

export class ReviewModerationService {
  constructor(
    private readonly reviewRepository: IMerchantReviewRepository,
    private readonly reportRepository: IReviewReportRepository,
    private readonly auditRepository: IReviewAuditRepository,
    private readonly eventRepository: ITrustEventRepository,
    private readonly timelineRepository?: IMerchantTimelineRepository
  ) {}

  async getPendingReviews(options?: PaginationOptions): Promise<PaginatedResult<MerchantReviewRecord>> {
    return this.reviewRepository.findByMerchantId("", { ...options, status: ReviewStatus.Pending });
  }

  async moderate(
    reviewId: string,
    adminId: string,
    action: ModerationAction,
    reason?: string
  ): Promise<MerchantReviewRecord | null> {
    const existing = await this.reviewRepository.findById(reviewId);
    if (!existing) return null;

    let newStatus: ReviewStatus;
    switch (action) {
      case "approve":
        newStatus = ReviewStatus.Approved;
        break;
      case "hide":
        newStatus = ReviewStatus.Hidden;
        break;
      case "remove":
        newStatus = ReviewStatus.Removed;
        break;
      case "restore":
        newStatus = ReviewStatus.Approved;
        break;
      default:
        return null;
    }

    const updated = await this.reviewRepository.updateStatus(reviewId, newStatus);
    if (!updated) return null;

    await this.auditRepository.create({
      review_id: reviewId,
      merchant_id: existing.merchant_id,
      action: action === "approve" || action === "restore" ? ReviewAction.Approved
        : action === "hide" ? ReviewAction.Hidden
        : ReviewAction.Removed,
      previous_body: null,
      new_body: null,
      previous_status: existing.status,
      new_status: newStatus,
      performed_by: adminId,
      performed_by_role: "admin",
      reason: reason ?? null,
      metadata: { action },
    });

    await this.eventRepository.create({
      merchant_id: existing.merchant_id,
      event_type: TrustEventType.ReviewModerated,
      source: TrustSource.Admin,
      metadata: { review_id: reviewId, action, admin_id: adminId },
      created_by: adminId,
    });

    if (action === "approve" && this.timelineRepository) {
      await this.timelineRepository.create({
        merchant_id: existing.merchant_id,
        event_type: TimelineEventType.ReviewReceived,
        title: `Nova avaliação — ${existing.rating}/5 estrelas`,
        description: null,
        category: TimelineEventCategory.Review,
        reference_id: reviewId,
        reference_type: "review",
        visibility: TimelineVisibility.Public,
        occurred_at: existing.created_at,
        metadata: { rating: existing.rating },
      });
    }

    return updated;
  }

  async reportReview(
    reviewId: string,
    reporterId: string,
    reason: ReviewReportReason,
    description?: string
  ): Promise<ReviewReportRecord | null> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) return null;

    const alreadyReported = await this.reportRepository.findByReporterAndReview(reporterId, reviewId);
    if (alreadyReported) return null;

    const report = await this.reportRepository.create({
      review_id: reviewId,
      merchant_id: review.merchant_id,
      reporter_id: reporterId,
      reason,
      description: description ?? null,
      status: ReviewReportStatus.Pending,
    });

    if (report) {
      await this.reviewRepository.incrementReports(reviewId);
      await this.auditRepository.create({
        review_id: reviewId,
        merchant_id: review.merchant_id,
        action: ReviewAction.ReportAdded,
        previous_body: null,
        new_body: null,
        previous_status: null,
        new_status: null,
        performed_by: reporterId,
        performed_by_role: "buyer",
        reason: reason,
        metadata: { report_id: report.id },
      });
      await this.eventRepository.create({
        merchant_id: review.merchant_id,
        event_type: TrustEventType.ReviewReported,
        source: TrustSource.Buyer,
        metadata: { review_id: reviewId, reason },
        created_by: reporterId,
      });
    }

    return report;
  }

  async getReports(reviewId: string): Promise<ReviewReportRecord[]> {
    return this.reportRepository.findByReviewId(reviewId);
  }

  async getPendingReports(options?: PaginationOptions): Promise<PaginatedResult<ReviewReportRecord>> {
    return this.reportRepository.findPending(options);
  }

  async reviewReport(
    reportId: string,
    adminId: string,
    status: ReviewReportStatus,
    actionTaken?: string
  ): Promise<ReviewReportRecord | null> {
    return this.reportRepository.updateStatus(reportId, status, adminId, actionTaken);
  }
}
