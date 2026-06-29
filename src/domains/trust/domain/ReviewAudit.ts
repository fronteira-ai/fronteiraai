import type { ReviewAuditRecord } from "../types/trust.types";

// INSERT-ONLY — never update or delete audit records
export class ReviewAudit {
  constructor(private readonly record: ReviewAuditRecord) {}

  get id() { return this.record.id; }
  get reviewId() { return this.record.review_id; }
  get merchantId() { return this.record.merchant_id; }
  get action() { return this.record.action; }
  get performedBy() { return this.record.performed_by; }
  get performedByRole() { return this.record.performed_by_role; }
  get createdAt() { return this.record.created_at; }

  toRecord(): ReviewAuditRecord {
    return { ...this.record };
  }
}
