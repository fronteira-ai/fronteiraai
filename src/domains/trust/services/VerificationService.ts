import type { IVerificationRepository } from "../repositories/IVerificationRepository";
import type { IVerificationEvidenceRepository } from "../repositories/IVerificationEvidenceRepository";
import type { IVerificationHistoryRepository } from "../repositories/IVerificationHistoryRepository";
import type { ITrustEventRepository } from "../repositories/ITrustEventRepository";
import type { MerchantVerificationRecord, VerificationEvidenceRecord, VerificationAuditRecord } from "../types/trust.types";
import { VerificationType, VerificationStatus, VerificationAction, TrustEventType, TrustSource } from "../types/enums";
import { VerificationResult } from "../domain/VerificationResult";
import type { VerificationAuditService } from "./VerificationAuditService";

export class VerificationService {
  constructor(
    private readonly verificationRepository: IVerificationRepository,
    private readonly eventRepository: ITrustEventRepository,
    private readonly auditService?: VerificationAuditService
  ) {}

  async getMerchantVerifications(merchantId: string): Promise<MerchantVerificationRecord[]> {
    return this.verificationRepository.findByMerchantId(merchantId);
  }

  async getVerificationById(verificationId: string): Promise<MerchantVerificationRecord | null> {
    return this.verificationRepository.findById(verificationId);
  }

  async getPendingVerifications(): Promise<MerchantVerificationRecord[]> {
    return this.verificationRepository.findPending();
  }

  async submitVerification(
    merchantId: string,
    type: VerificationType,
    metadata?: Record<string, unknown>
  ): Promise<MerchantVerificationRecord | null> {
    const verification = await this.verificationRepository.create(merchantId, type, metadata);
    if (!verification) return null;

    await this.eventRepository.create({
      merchant_id: merchantId,
      event_type: TrustEventType.VerificationSubmitted,
      source: TrustSource.Merchant,
      metadata: { verification_type: type, verification_id: verification.id },
    });

    await this.auditService?.recordCreated(verification.id, merchantId, merchantId);

    return verification;
  }

  async approveVerification(
    verificationId: string,
    adminId: string
  ): Promise<MerchantVerificationRecord | null> {
    const verification = await this.verificationRepository.findById(verificationId);
    if (!verification) return null;

    const updated = await this.verificationRepository.updateStatus(
      verificationId,
      VerificationStatus.Approved,
      adminId
    );
    if (!updated) return null;

    await this.eventRepository.create({
      merchant_id: verification.merchant_id,
      event_type: TrustEventType.VerificationApproved,
      source: TrustSource.Admin,
      metadata: { verification_type: verification.verification_type, verification_id: verificationId },
      created_by: adminId,
    });

    await this.auditService?.recordStatusChange(
      verificationId,
      verification.merchant_id,
      VerificationAction.Approved,
      verification.status as VerificationStatus,
      VerificationStatus.Approved,
      adminId,
      "admin"
    );

    return updated;
  }

  async rejectVerification(
    verificationId: string,
    adminId: string,
    reason: string
  ): Promise<MerchantVerificationRecord | null> {
    const verification = await this.verificationRepository.findById(verificationId);
    if (!verification) return null;

    const updated = await this.verificationRepository.updateStatus(
      verificationId,
      VerificationStatus.Rejected,
      adminId,
      reason
    );
    if (!updated) return null;

    await this.eventRepository.create({
      merchant_id: verification.merchant_id,
      event_type: TrustEventType.VerificationRejected,
      source: TrustSource.Admin,
      metadata: { verification_type: verification.verification_type, reason },
      created_by: adminId,
    });

    await this.auditService?.recordStatusChange(
      verificationId,
      verification.merchant_id,
      VerificationAction.Rejected,
      verification.status as VerificationStatus,
      VerificationStatus.Rejected,
      adminId,
      "admin",
      reason
    );

    return updated;
  }

  async revokeVerification(
    verificationId: string,
    adminId: string,
    reason: string
  ): Promise<MerchantVerificationRecord | null> {
    const verification = await this.verificationRepository.findById(verificationId);
    if (!verification) return null;
    if (verification.status !== VerificationStatus.Approved) return null;

    const updated = await this.verificationRepository.updateStatus(
      verificationId,
      VerificationStatus.Revoked,
      adminId,
      reason
    );
    if (!updated) return null;

    await this.eventRepository.create({
      merchant_id: verification.merchant_id,
      event_type: TrustEventType.VerificationRevoked,
      source: TrustSource.Admin,
      metadata: { verification_type: verification.verification_type, reason },
      created_by: adminId,
    });

    await this.auditService?.recordStatusChange(
      verificationId,
      verification.merchant_id,
      VerificationAction.Revoked,
      VerificationStatus.Approved,
      VerificationStatus.Revoked,
      adminId,
      "admin",
      reason
    );

    return updated;
  }

  async getVerificationResult(
    verificationId: string,
    evidenceRepository: IVerificationEvidenceRepository,
    historyRepository: IVerificationHistoryRepository
  ): Promise<VerificationResult | null> {
    const verification = await this.verificationRepository.findById(verificationId);
    if (!verification) return null;

    const [evidence, history]: [VerificationEvidenceRecord[], VerificationAuditRecord[]] = await Promise.all([
      evidenceRepository.findByVerificationId(verificationId),
      historyRepository.findByVerificationId(verificationId),
    ]);

    return new VerificationResult(verification, null, evidence, history);
  }

  getVerificationTypeLabel(type: VerificationType): string {
    const labels: Record<VerificationType, string> = {
      [VerificationType.Document]: "Documento",
      [VerificationType.Address]: "Endereço",
      [VerificationType.Phone]: "Telefone",
      [VerificationType.Email]: "E-mail",
      [VerificationType.Bank]: "Conta Bancária",
      [VerificationType.SocialMedia]: "Redes Sociais",
      [VerificationType.Manual]: "Verificação Manual",
      [VerificationType.Identity]: "Identidade",
      [VerificationType.Company]: "Empresa",
      [VerificationType.Location]: "Localização",
      [VerificationType.Contact]: "Contato",
      [VerificationType.Hours]: "Horários",
      [VerificationType.Operation]: "Operação",
      [VerificationType.Partner]: "Parceiro Oficial",
      [VerificationType.Documentation]: "Documentação",
      [VerificationType.StoreClaim]: "Reivindicação de Loja",
    };
    return labels[type] ?? type;
  }
}
