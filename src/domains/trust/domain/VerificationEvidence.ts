import { EvidenceType } from "../types/enums";
import type { VerificationEvidenceRecord } from "../types/trust.types";

export class VerificationEvidence {
  readonly id: string;
  readonly verificationId: string;
  readonly merchantId: string;
  readonly evidenceType: EvidenceType;
  readonly label: string;
  readonly content: string | null;
  readonly filePath: string | null;
  readonly mimeType: string | null;
  readonly fileSizeBytes: number | null;
  readonly uploadedBy: string | null;
  readonly isValid: boolean | null;
  readonly reviewNote: string | null;
  readonly createdAt: Date;
  readonly deletedAt: Date | null;

  private constructor(record: VerificationEvidenceRecord) {
    this.id = record.id;
    this.verificationId = record.verification_id;
    this.merchantId = record.merchant_id;
    this.evidenceType = record.evidence_type as EvidenceType;
    this.label = record.label;
    this.content = record.content;
    this.filePath = record.file_path;
    this.mimeType = record.mime_type;
    this.fileSizeBytes = record.file_size_bytes;
    this.uploadedBy = record.uploaded_by;
    this.isValid = record.is_valid;
    this.reviewNote = record.review_note;
    this.createdAt = new Date(record.created_at);
    this.deletedAt = record.deleted_at ? new Date(record.deleted_at) : null;
  }

  static fromRecord(record: VerificationEvidenceRecord): VerificationEvidence {
    return new VerificationEvidence(record);
  }

  isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  isDocument(): boolean {
    return this.evidenceType === EvidenceType.Document || this.evidenceType === EvidenceType.Image;
  }

  displayUrl(): string | null {
    if (this.evidenceType === EvidenceType.Url) return this.content;
    if (this.filePath) return this.filePath;
    return null;
  }

  toRecord(): VerificationEvidenceRecord {
    return {
      id: this.id,
      verification_id: this.verificationId,
      merchant_id: this.merchantId,
      evidence_type: this.evidenceType,
      label: this.label,
      content: this.content,
      file_path: this.filePath,
      mime_type: this.mimeType,
      file_size_bytes: this.fileSizeBytes,
      uploaded_by: this.uploadedBy,
      is_valid: this.isValid,
      review_note: this.reviewNote,
      created_at: this.createdAt.toISOString(),
      deleted_at: this.deletedAt?.toISOString() ?? null,
    };
  }
}
