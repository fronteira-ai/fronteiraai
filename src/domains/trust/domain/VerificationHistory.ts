import { VerificationAction, VerificationStatus } from "../types/enums";
import type { VerificationAuditRecord } from "../types/trust.types";

export class VerificationHistory {
  readonly id: string;
  readonly verificationId: string;
  readonly merchantId: string;
  readonly action: VerificationAction;
  readonly previousStatus: VerificationStatus | null;
  readonly newStatus: VerificationStatus | null;
  readonly performedBy: string | null;
  readonly performedByRole: string | null;
  readonly reason: string | null;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Date;

  private constructor(record: VerificationAuditRecord) {
    this.id = record.id;
    this.verificationId = record.verification_id;
    this.merchantId = record.merchant_id;
    this.action = record.action as VerificationAction;
    this.previousStatus = record.previous_status as VerificationStatus | null;
    this.newStatus = record.new_status as VerificationStatus | null;
    this.performedBy = record.performed_by;
    this.performedByRole = record.performed_by_role;
    this.reason = record.reason;
    this.metadata = record.metadata;
    this.createdAt = new Date(record.created_at);
  }

  static fromRecord(record: VerificationAuditRecord): VerificationHistory {
    return new VerificationHistory(record);
  }

  wasStatusChange(): boolean {
    return this.previousStatus !== null && this.newStatus !== null;
  }

  isApprovalEvent(): boolean {
    return this.action === VerificationAction.Approved;
  }

  isRejectionEvent(): boolean {
    return this.action === VerificationAction.Rejected || this.action === VerificationAction.Revoked;
  }

  label(): string {
    const labels: Record<VerificationAction, string> = {
      [VerificationAction.Created]: "Criada",
      [VerificationAction.Submitted]: "Submetida",
      [VerificationAction.Approved]: "Aprovada",
      [VerificationAction.Rejected]: "Rejeitada",
      [VerificationAction.Revoked]: "Revogada",
      [VerificationAction.Expired]: "Expirada",
      [VerificationAction.EvidenceAdded]: "Evidência adicionada",
      [VerificationAction.EvidenceRemoved]: "Evidência removida",
      [VerificationAction.MetadataUpdated]: "Informações atualizadas",
    };
    return labels[this.action] ?? this.action;
  }

  toRecord(): VerificationAuditRecord {
    return {
      id: this.id,
      verification_id: this.verificationId,
      merchant_id: this.merchantId,
      action: this.action,
      previous_status: this.previousStatus,
      new_status: this.newStatus,
      performed_by: this.performedBy,
      performed_by_role: this.performedByRole,
      reason: this.reason,
      metadata: this.metadata,
      created_at: this.createdAt.toISOString(),
    };
  }
}
