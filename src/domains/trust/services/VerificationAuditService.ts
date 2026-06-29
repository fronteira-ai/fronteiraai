import type { IVerificationHistoryRepository, CreateAuditInput } from "../repositories/IVerificationHistoryRepository";
import type { VerificationAuditRecord } from "../types/trust.types";
import { VerificationAction, VerificationStatus } from "../types/enums";

export class VerificationAuditService {
  constructor(private readonly historyRepository: IVerificationHistoryRepository) {}

  async recordAction(input: CreateAuditInput): Promise<VerificationAuditRecord | null> {
    return this.historyRepository.create(input);
  }

  async recordCreated(
    verificationId: string,
    merchantId: string,
    performedBy?: string
  ): Promise<VerificationAuditRecord | null> {
    return this.historyRepository.create({
      verification_id: verificationId,
      merchant_id: merchantId,
      action: VerificationAction.Created,
      new_status: VerificationStatus.Pending,
      performed_by: performedBy ?? null,
      performed_by_role: performedBy ? "merchant" : null,
    });
  }

  async recordStatusChange(
    verificationId: string,
    merchantId: string,
    action: VerificationAction,
    previousStatus: VerificationStatus,
    newStatus: VerificationStatus,
    performedBy: string,
    performedByRole: string,
    reason?: string
  ): Promise<VerificationAuditRecord | null> {
    return this.historyRepository.create({
      verification_id: verificationId,
      merchant_id: merchantId,
      action,
      previous_status: previousStatus,
      new_status: newStatus,
      performed_by: performedBy,
      performed_by_role: performedByRole,
      reason: reason ?? null,
    });
  }

  async recordEvidenceAdded(
    verificationId: string,
    merchantId: string,
    uploadedBy: string,
    evidenceLabel: string
  ): Promise<VerificationAuditRecord | null> {
    return this.historyRepository.create({
      verification_id: verificationId,
      merchant_id: merchantId,
      action: VerificationAction.EvidenceAdded,
      performed_by: uploadedBy,
      metadata: { evidence_label: evidenceLabel },
    });
  }

  async recordEvidenceRemoved(
    verificationId: string,
    merchantId: string,
    removedBy: string,
    evidenceId: string
  ): Promise<VerificationAuditRecord | null> {
    return this.historyRepository.create({
      verification_id: verificationId,
      merchant_id: merchantId,
      action: VerificationAction.EvidenceRemoved,
      performed_by: removedBy,
      metadata: { evidence_id: evidenceId },
    });
  }

  async getVerificationHistory(verificationId: string): Promise<VerificationAuditRecord[]> {
    return this.historyRepository.findByVerificationId(verificationId);
  }

  async getMerchantAuditLog(merchantId: string, limit?: number): Promise<VerificationAuditRecord[]> {
    return this.historyRepository.findByMerchantId(merchantId, limit);
  }
}
