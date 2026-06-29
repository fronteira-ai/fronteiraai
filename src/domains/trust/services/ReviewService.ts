import type { IMerchantReviewRepository } from "../repositories/IMerchantReviewRepository";
import type { IReviewAuditRepository } from "../repositories/IReviewAuditRepository";
import type { ITrustEventRepository } from "../repositories/ITrustEventRepository";
import type { IMerchantTimelineRepository } from "../repositories/IMerchantTimelineRepository";
import type { MerchantReviewRecord, ReviewStats, PaginatedResult, PaginationOptions } from "../types/trust.types";
import {
  ReviewStatus,
  ReviewAction,
  TrustEventType,
  TrustSource,
  TimelineEventType,
  TimelineEventCategory,
  TimelineVisibility,
} from "../types/enums";

export class ReviewService {
  constructor(
    private readonly reviewRepository: IMerchantReviewRepository,
    private readonly auditRepository: IReviewAuditRepository,
    private readonly eventRepository: ITrustEventRepository,
    private readonly timelineRepository?: IMerchantTimelineRepository
  ) {}

  async getApprovedReviews(merchantId: string, options?: PaginationOptions): Promise<PaginatedResult<MerchantReviewRecord>> {
    return this.reviewRepository.findByMerchantId(merchantId, { ...options, status: ReviewStatus.Approved });
  }

  async getAllReviews(merchantId: string, options?: PaginationOptions): Promise<PaginatedResult<MerchantReviewRecord>> {
    return this.reviewRepository.findByMerchantId(merchantId, options);
  }

  async getById(id: string): Promise<MerchantReviewRecord | null> {
    return this.reviewRepository.findById(id);
  }

  async getStats(merchantId: string): Promise<ReviewStats> {
    return this.reviewRepository.getStats(merchantId);
  }

  async submitReview(
    merchantId: string,
    reviewerId: string,
    input: { rating: number; body: string; title?: string }
  ): Promise<MerchantReviewRecord | null> {
    // Prevent duplicate review
    const existing = await this.reviewRepository.findByReviewerAndMerchant(reviewerId, merchantId);
    if (existing && !existing.deleted_at) return null;

    const review = await this.reviewRepository.create({
      merchant_id: merchantId,
      reviewer_id: reviewerId,
      rating: input.rating,
      title: input.title ?? null,
      body: input.body,
      status: ReviewStatus.Pending,
      is_verified_purchase: false,
      purchase_ref: null,
      merchant_reply: null,
      merchant_reply_at: null,
      edited_at: null,
      metadata: {},
    });

    if (!review) return null;

    await this.auditRepository.create({
      review_id: review.id,
      merchant_id: merchantId,
      action: ReviewAction.Created,
      previous_body: null,
      new_body: review.body,
      previous_status: null,
      new_status: ReviewStatus.Pending,
      performed_by: reviewerId,
      performed_by_role: "buyer",
      reason: null,
      metadata: {},
    });

    await this.eventRepository.create({
      merchant_id: merchantId,
      event_type: TrustEventType.ReviewCreated,
      source: TrustSource.Buyer,
      metadata: { review_id: review.id, rating: input.rating },
      created_by: reviewerId,
    });

    return review;
  }

  async editReview(
    reviewId: string,
    reviewerId: string,
    input: { rating?: number; body?: string; title?: string }
  ): Promise<MerchantReviewRecord | null> {
    const existing = await this.reviewRepository.findById(reviewId);
    if (!existing) return null;
    if (existing.reviewer_id !== reviewerId) return null;
    if (existing.deleted_at) return null;
    if (existing.status !== ReviewStatus.Pending && existing.status !== ReviewStatus.Approved) return null;

    const updated = await this.reviewRepository.update(reviewId, {
      ...input,
      edited_at: new Date().toISOString(),
      edit_count: existing.edit_count + 1,
      // Reset to pending after edit so it goes through moderation again
      status: ReviewStatus.Pending,
    });

    if (!updated) return null;

    await this.auditRepository.create({
      review_id: reviewId,
      merchant_id: existing.merchant_id,
      action: ReviewAction.Edited,
      previous_body: existing.body,
      new_body: updated.body,
      previous_status: existing.status,
      new_status: updated.status,
      performed_by: reviewerId,
      performed_by_role: "buyer",
      reason: null,
      metadata: {},
    });

    await this.eventRepository.create({
      merchant_id: existing.merchant_id,
      event_type: TrustEventType.ReviewUpdated,
      source: TrustSource.Buyer,
      metadata: { review_id: reviewId },
      created_by: reviewerId,
    });

    return updated;
  }

  async softDeleteReview(reviewId: string, reviewerId: string): Promise<boolean> {
    const existing = await this.reviewRepository.findById(reviewId);
    if (!existing) return false;
    if (existing.reviewer_id !== reviewerId) return false;

    const deleted = await this.reviewRepository.softDelete(reviewId);

    if (deleted) {
      await this.auditRepository.create({
        review_id: reviewId,
        merchant_id: existing.merchant_id,
        action: ReviewAction.Removed,
        previous_body: existing.body,
        new_body: null,
        previous_status: existing.status,
        new_status: "deleted",
        performed_by: reviewerId,
        performed_by_role: "buyer",
        reason: "Removida pelo autor",
        metadata: {},
      });
    }

    return deleted;
  }

  async addMerchantReply(
    reviewId: string,
    merchantUserId: string,
    reply: string
  ): Promise<MerchantReviewRecord | null> {
    const existing = await this.reviewRepository.findById(reviewId);
    if (!existing) return null;
    if (existing.status !== ReviewStatus.Approved) return null;

    const updated = await this.reviewRepository.update(reviewId, {
      merchant_reply: reply,
      merchant_reply_at: new Date().toISOString(),
    });

    if (updated) {
      await this.auditRepository.create({
        review_id: reviewId,
        merchant_id: existing.merchant_id,
        action: ReviewAction.MerchantReplied,
        previous_body: null,
        new_body: reply,
        previous_status: null,
        new_status: null,
        performed_by: merchantUserId,
        performed_by_role: "merchant",
        reason: null,
        metadata: {},
      });
    }

    return updated;
  }

  async markHelpful(reviewId: string, userId: string): Promise<void> {
    await this.reviewRepository.incrementHelpful(reviewId);

    const review = await this.reviewRepository.findById(reviewId);
    if (review) {
      await this.eventRepository.create({
        merchant_id: review.merchant_id,
        event_type: TrustEventType.ReviewHelpfulMarked,
        source: TrustSource.Buyer,
        metadata: { review_id: reviewId },
        created_by: userId,
      });
    }
  }

  async getReviewHistory(reviewId: string) {
    return this.auditRepository.findByReviewId(reviewId);
  }

  async approveAndPostToTimeline(review: MerchantReviewRecord): Promise<void> {
    if (!this.timelineRepository) return;
    await this.timelineRepository.create({
      merchant_id: review.merchant_id,
      event_type: TimelineEventType.ReviewReceived,
      title: `Nova avaliação — ${review.rating}/5 estrelas`,
      description: null,
      category: TimelineEventCategory.Review,
      reference_id: review.id,
      reference_type: "review",
      visibility: TimelineVisibility.Public,
      occurred_at: review.created_at,
      metadata: { rating: review.rating },
    });
  }
}
