import type { VerificationAuditRecord } from "../types/trust.types";
import type { VerificationAction, VerificationStatus } from "../types/enums";

export type CreateAuditInput = {
  verification_id: string;
  merchant_id: string;
  action: VerificationAction;
  previous_status?: VerificationStatus | null;
  new_status?: VerificationStatus | null;
  performed_by?: string | null;
  performed_by_role?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

export interface IVerificationHistoryRepository {
  findByVerificationId(verificationId: string): Promise<VerificationAuditRecord[]>;
  findByMerchantId(merchantId: string, limit?: number): Promise<VerificationAuditRecord[]>;
  create(input: CreateAuditInput): Promise<VerificationAuditRecord | null>;
}
