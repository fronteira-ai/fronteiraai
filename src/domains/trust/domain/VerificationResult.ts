import { VerificationStatus } from "../types/enums";
import type {
  MerchantVerificationRecord,
  VerificationTypeCatalogRecord,
  VerificationEvidenceRecord,
  VerificationAuditRecord,
} from "../types/trust.types";

export class VerificationResult {
  constructor(
    public readonly verification: MerchantVerificationRecord,
    public readonly typeCatalog: VerificationTypeCatalogRecord | null,
    public readonly evidence: VerificationEvidenceRecord[],
    public readonly history: VerificationAuditRecord[]
  ) {}

  isActive(): boolean {
    return (
      this.verification.status === VerificationStatus.Approved &&
      !this.isExpired()
    );
  }

  isExpired(): boolean {
    if (this.verification.status === VerificationStatus.Expired) return true;
    if (!this.verification.expires_at) return false;
    return new Date() > new Date(this.verification.expires_at);
  }

  isPending(): boolean {
    return this.verification.status === VerificationStatus.Pending;
  }

  isRevoked(): boolean {
    return this.verification.status === VerificationStatus.Revoked;
  }

  hasEvidence(): boolean {
    return this.evidence.filter((e) => !e.deleted_at).length > 0;
  }

  activeEvidenceCount(): number {
    return this.evidence.filter((e) => !e.deleted_at).length;
  }

  lastAuditAction(): VerificationAuditRecord | null {
    if (this.history.length === 0) return null;
    return [...this.history].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }

  typeLabel(): string {
    return this.typeCatalog?.label ?? String(this.verification.verification_type);
  }

  categoryLabel(): string {
    if (!this.typeCatalog) return "—";
    const labels: Record<string, string> = {
      identity: "Identidade",
      business: "Empresa",
      operational: "Operacional",
      compliance: "Conformidade",
    };
    return labels[this.typeCatalog.category] ?? this.typeCatalog.category;
  }
}
