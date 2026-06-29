import type { VerificationEvidenceRecord } from "../types/trust.types";
import type { EvidenceType } from "../types/enums";

export type CreateEvidenceInput = {
  verification_id: string;
  merchant_id: string;
  evidence_type: EvidenceType;
  label: string;
  content?: string;
  file_path?: string;
  mime_type?: string;
  file_size_bytes?: number;
  uploaded_by?: string;
};

export interface IVerificationEvidenceRepository {
  findByVerificationId(verificationId: string): Promise<VerificationEvidenceRecord[]>;
  findActive(verificationId: string): Promise<VerificationEvidenceRecord[]>;
  create(input: CreateEvidenceInput): Promise<VerificationEvidenceRecord | null>;
  markValid(id: string, reviewNote?: string): Promise<VerificationEvidenceRecord | null>;
  markInvalid(id: string, reviewNote: string): Promise<VerificationEvidenceRecord | null>;
  softDelete(id: string): Promise<void>;
}
