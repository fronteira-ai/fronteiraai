import type { MerchantReviewRecord } from "../types/trust.types";
import { ReviewStatus } from "../types/enums";

export class MerchantReview {
  constructor(private readonly record: MerchantReviewRecord) {}

  get id() { return this.record.id; }
  get merchantId() { return this.record.merchant_id; }
  get reviewerId() { return this.record.reviewer_id; }
  get rating() { return this.record.rating; }
  get body() { return this.record.body; }
  get status() { return this.record.status; }
  get isVerifiedPurchase() { return this.record.is_verified_purchase; }
  get helpfulCount() { return this.record.helpful_count; }
  get reportCount() { return this.record.report_count; }

  isVisible(): boolean {
    return this.record.status === ReviewStatus.Approved && !this.record.deleted_at;
  }

  isOwnedBy(userId: string): boolean {
    return this.record.reviewer_id === userId;
  }

  canBeEditedBy(userId: string): boolean {
    return this.isOwnedBy(userId)
      && (this.record.status === ReviewStatus.Pending || this.record.status === ReviewStatus.Approved)
      && !this.record.deleted_at;
  }

  toRecord(): MerchantReviewRecord {
    return { ...this.record };
  }
}
