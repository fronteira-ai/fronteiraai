import { TrustStatus, TrustBadge } from "../types/enums";
import type { MerchantTrustRecord } from "../types/trust.types";

export class MerchantTrust {
  readonly id: string;
  readonly merchantId: string;
  readonly trustScore: number;
  readonly status: TrustStatus;
  readonly badgeLevel: TrustBadge;
  readonly lastVerifiedAt: Date | null;
  readonly lastEventAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(record: MerchantTrustRecord) {
    this.id = record.id;
    this.merchantId = record.merchant_id;
    this.trustScore = record.trust_score;
    this.status = record.status as TrustStatus;
    this.badgeLevel = record.badge_level as TrustBadge;
    this.lastVerifiedAt = record.last_verified_at ? new Date(record.last_verified_at) : null;
    this.lastEventAt = record.last_event_at ? new Date(record.last_event_at) : null;
    this.createdAt = new Date(record.created_at);
    this.updatedAt = new Date(record.updated_at);
  }

  static fromRecord(record: MerchantTrustRecord): MerchantTrust {
    return new MerchantTrust(record);
  }

  isVerified(): boolean {
    return this.status === TrustStatus.Verified;
  }

  isSuspended(): boolean {
    return this.status === TrustStatus.Suspended;
  }

  hasBadge(): boolean {
    return this.badgeLevel !== TrustBadge.None;
  }

  isPremium(): boolean {
    return this.badgeLevel === TrustBadge.Premium;
  }

  monthsActive(): number {
    const now = new Date();
    const diff = now.getTime() - this.createdAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
  }

  toRecord(): MerchantTrustRecord {
    return {
      id: this.id,
      merchant_id: this.merchantId,
      trust_score: this.trustScore,
      status: this.status,
      badge_level: this.badgeLevel,
      last_verified_at: this.lastVerifiedAt?.toISOString() ?? null,
      last_event_at: this.lastEventAt?.toISOString() ?? null,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }
}
