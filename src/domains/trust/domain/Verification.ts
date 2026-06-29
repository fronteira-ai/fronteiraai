import { VerificationType, VerificationStatus } from "../types/enums";
import type { MerchantVerificationRecord } from "../types/trust.types";

export class Verification {
  readonly id: string;
  readonly merchantId: string;
  readonly verificationType: VerificationType;
  readonly status: VerificationStatus;
  readonly submittedAt: Date;
  readonly reviewedAt: Date | null;
  readonly reviewedBy: string | null;
  readonly rejectionReason: string | null;
  readonly expiresAt: Date | null;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Date;

  private constructor(record: MerchantVerificationRecord) {
    this.id = record.id;
    this.merchantId = record.merchant_id;
    this.verificationType = record.verification_type as VerificationType;
    this.status = record.status as VerificationStatus;
    this.submittedAt = new Date(record.submitted_at);
    this.reviewedAt = record.reviewed_at ? new Date(record.reviewed_at) : null;
    this.reviewedBy = record.reviewed_by;
    this.rejectionReason = record.rejection_reason;
    this.expiresAt = record.expires_at ? new Date(record.expires_at) : null;
    this.metadata = record.metadata;
    this.createdAt = new Date(record.created_at);
  }

  static fromRecord(record: MerchantVerificationRecord): Verification {
    return new Verification(record);
  }

  isPending(): boolean {
    return this.status === VerificationStatus.Pending;
  }

  isApproved(): boolean {
    return this.status === VerificationStatus.Approved;
  }

  isExpired(): boolean {
    if (this.status === VerificationStatus.Expired) return true;
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  toRecord(): MerchantVerificationRecord {
    return {
      id: this.id,
      merchant_id: this.merchantId,
      verification_type: this.verificationType,
      status: this.status,
      submitted_at: this.submittedAt.toISOString(),
      reviewed_at: this.reviewedAt?.toISOString() ?? null,
      reviewed_by: this.reviewedBy,
      rejection_reason: this.rejectionReason,
      expires_at: this.expiresAt?.toISOString() ?? null,
      metadata: this.metadata,
      created_at: this.createdAt.toISOString(),
    };
  }
}
