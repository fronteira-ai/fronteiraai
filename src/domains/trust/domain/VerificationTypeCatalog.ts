import { VerificationCategory } from "../types/enums";
import type { VerificationTypeCatalogRecord } from "../types/trust.types";

export class VerificationTypeCatalog {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly category: VerificationCategory;
  readonly requiresEvidence: boolean;
  readonly validityDays: number | null;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly createdAt: Date;

  private constructor(record: VerificationTypeCatalogRecord) {
    this.id = record.id;
    this.label = record.label;
    this.description = record.description;
    this.category = record.category as VerificationCategory;
    this.requiresEvidence = record.requires_evidence;
    this.validityDays = record.validity_days;
    this.sortOrder = record.sort_order;
    this.isActive = record.is_active;
    this.createdAt = new Date(record.created_at);
  }

  static fromRecord(record: VerificationTypeCatalogRecord): VerificationTypeCatalog {
    return new VerificationTypeCatalog(record);
  }

  hasExpiry(): boolean {
    return this.validityDays !== null;
  }

  expiryLabel(): string {
    if (!this.validityDays) return "Sem validade";
    if (this.validityDays === 365) return "1 ano";
    if (this.validityDays === 730) return "2 anos";
    return `${this.validityDays} dias`;
  }

  categoryLabel(): string {
    const labels: Record<VerificationCategory, string> = {
      [VerificationCategory.Identity]: "Identidade",
      [VerificationCategory.Business]: "Empresa",
      [VerificationCategory.Operational]: "Operacional",
      [VerificationCategory.Compliance]: "Conformidade",
    };
    return labels[this.category] ?? this.category;
  }

  toRecord(): VerificationTypeCatalogRecord {
    return {
      id: this.id,
      label: this.label,
      description: this.description,
      category: this.category,
      requires_evidence: this.requiresEvidence,
      validity_days: this.validityDays,
      sort_order: this.sortOrder,
      is_active: this.isActive,
      created_at: this.createdAt.toISOString(),
    };
  }
}
