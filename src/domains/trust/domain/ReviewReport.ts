import type { ReviewReportRecord } from "../types/trust.types";
import { ReviewReportStatus } from "../types/enums";

export class ReviewReport {
  constructor(private readonly record: ReviewReportRecord) {}

  get id() { return this.record.id; }
  get reviewId() { return this.record.review_id; }
  get merchantId() { return this.record.merchant_id; }
  get reporterId() { return this.record.reporter_id; }
  get reason() { return this.record.reason; }
  get status() { return this.record.status; }

  isPending(): boolean {
    return this.record.status === ReviewReportStatus.Pending;
  }

  toRecord(): ReviewReportRecord {
    return { ...this.record };
  }
}
