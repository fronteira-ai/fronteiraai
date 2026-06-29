import { TrustBadge } from "../types/enums";
import type { MerchantBadgeRecord } from "../types/trust.types";

export class Badge {
  readonly id: string;
  readonly merchantId: string;
  readonly badgeType: TrustBadge;
  readonly grantedAt: Date;
  readonly expiresAt: Date | null;
  readonly revokedAt: Date | null;
  readonly revokeReason: string | null;
  readonly grantedBy: string | null;
  readonly isActive: boolean;
  readonly metadata: Record<string, unknown>;

  private constructor(record: MerchantBadgeRecord) {
    this.id = record.id;
    this.merchantId = record.merchant_id;
    this.badgeType = record.badge_type as TrustBadge;
    this.grantedAt = new Date(record.granted_at);
    this.expiresAt = record.expires_at ? new Date(record.expires_at) : null;
    this.revokedAt = record.revoked_at ? new Date(record.revoked_at) : null;
    this.revokeReason = record.revoke_reason;
    this.grantedBy = record.granted_by;
    this.isActive = record.is_active;
    this.metadata = record.metadata;
  }

  static fromRecord(record: MerchantBadgeRecord): Badge {
    return new Badge(record);
  }

  isValid(): boolean {
    if (!this.isActive) return false;
    if (this.revokedAt) return false;
    if (this.expiresAt && new Date() > this.expiresAt) return false;
    return true;
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  label(): string {
    const labels: Record<TrustBadge, string> = {
      [TrustBadge.None]: "Sem badge",
      [TrustBadge.Basic]: "Loja",
      [TrustBadge.Verified]: "Verificada",
      [TrustBadge.Premium]: "Verificada Premium",
    };
    return labels[this.badgeType];
  }

  toRecord(): MerchantBadgeRecord {
    return {
      id: this.id,
      merchant_id: this.merchantId,
      badge_type: this.badgeType,
      granted_at: this.grantedAt.toISOString(),
      expires_at: this.expiresAt?.toISOString() ?? null,
      revoked_at: this.revokedAt?.toISOString() ?? null,
      revoke_reason: this.revokeReason,
      granted_by: this.grantedBy,
      is_active: this.isActive,
      metadata: this.metadata,
    };
  }
}
