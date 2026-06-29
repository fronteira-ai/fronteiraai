import type { MerchantVerificationRecord } from "../types/trust.types";
import type { VerificationType, VerificationStatus } from "../types/enums";

export interface IVerificationRepository {
  findById(id: string): Promise<MerchantVerificationRecord | null>;
  findByMerchantId(merchantId: string): Promise<MerchantVerificationRecord[]>;
  findPending(): Promise<MerchantVerificationRecord[]>;
  create(
    merchantId: string,
    type: VerificationType,
    metadata?: Record<string, unknown>
  ): Promise<MerchantVerificationRecord | null>;
  updateStatus(
    id: string,
    status: VerificationStatus,
    reviewedBy: string,
    rejectionReason?: string
  ): Promise<MerchantVerificationRecord | null>;
}
