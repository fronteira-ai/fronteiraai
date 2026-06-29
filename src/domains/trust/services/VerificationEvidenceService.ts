import type { IVerificationEvidenceRepository, CreateEvidenceInput } from "../repositories/IVerificationEvidenceRepository";
import type { VerificationEvidenceRecord } from "../types/trust.types";
import { EvidenceType } from "../types/enums";
import type { VerificationAuditService } from "./VerificationAuditService";

export class VerificationEvidenceService {
  constructor(
    private readonly evidenceRepository: IVerificationEvidenceRepository,
    private readonly auditService: VerificationAuditService
  ) {}

  async getEvidence(verificationId: string): Promise<VerificationEvidenceRecord[]> {
    return this.evidenceRepository.findActive(verificationId);
  }

  async getAllEvidence(verificationId: string): Promise<VerificationEvidenceRecord[]> {
    return this.evidenceRepository.findByVerificationId(verificationId);
  }

  async addEvidence(
    input: CreateEvidenceInput,
    uploadedBy: string
  ): Promise<VerificationEvidenceRecord | null> {
    const evidence = await this.evidenceRepository.create({
      ...input,
      uploaded_by: uploadedBy,
    });
    if (!evidence) return null;

    await this.auditService.recordEvidenceAdded(
      input.verification_id,
      input.merchant_id,
      uploadedBy,
      input.label
    );

    return evidence;
  }

  async validateEvidence(
    evidenceId: string,
    verificationId: string,
    merchantId: string,
    adminId: string,
    note?: string
  ): Promise<VerificationEvidenceRecord | null> {
    const updated = await this.evidenceRepository.markValid(evidenceId, note);
    if (!updated) return null;

    await this.auditService.recordAction({
      verification_id: verificationId,
      merchant_id: merchantId,
      action: "metadata_updated" as never,
      performed_by: adminId,
      performed_by_role: "admin",
      metadata: { evidence_id: evidenceId, validated: true },
    });

    return updated;
  }

  async invalidateEvidence(
    evidenceId: string,
    verificationId: string,
    merchantId: string,
    adminId: string,
    note: string
  ): Promise<VerificationEvidenceRecord | null> {
    const updated = await this.evidenceRepository.markInvalid(evidenceId, note);
    if (!updated) return null;

    await this.auditService.recordAction({
      verification_id: verificationId,
      merchant_id: merchantId,
      action: "metadata_updated" as never,
      performed_by: adminId,
      performed_by_role: "admin",
      metadata: { evidence_id: evidenceId, validated: false, note },
    });

    return updated;
  }

  async removeEvidence(
    evidenceId: string,
    verificationId: string,
    merchantId: string,
    removedBy: string
  ): Promise<void> {
    await this.evidenceRepository.softDelete(evidenceId);
    await this.auditService.recordEvidenceRemoved(verificationId, merchantId, removedBy, evidenceId);
  }

  getEvidenceTypeLabel(type: EvidenceType): string {
    const labels: Record<EvidenceType, string> = {
      [EvidenceType.Document]: "Documento",
      [EvidenceType.Image]: "Imagem",
      [EvidenceType.Url]: "URL",
      [EvidenceType.Text]: "Texto",
      [EvidenceType.Json]: "Dados JSON",
    };
    return labels[type] ?? type;
  }
}
