import { TrustStatus, TrustBadge } from "../types/enums";
import type { TrustHistoryRecord } from "../types/trust.types";

export class TrustHistory {
  readonly id: string;
  readonly merchantId: string;
  readonly snapshotDate: Date;
  readonly trustScore: number;
  readonly status: TrustStatus;
  readonly badgeLevel: TrustBadge | null;
  readonly eventCount: number;
  readonly verificationCount: number;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Date;

  private constructor(record: TrustHistoryRecord) {
    this.id = record.id;
    this.merchantId = record.merchant_id;
    this.snapshotDate = new Date(record.snapshot_date);
    this.trustScore = record.trust_score;
    this.status = record.status as TrustStatus;
    this.badgeLevel = record.badge_level as TrustBadge | null;
    this.eventCount = record.event_count;
    this.verificationCount = record.verification_count;
    this.metadata = record.metadata;
    this.createdAt = new Date(record.created_at);
  }

  static fromRecord(record: TrustHistoryRecord): TrustHistory {
    return new TrustHistory(record);
  }

  toRecord(): TrustHistoryRecord {
    return {
      id: this.id,
      merchant_id: this.merchantId,
      snapshot_date: this.snapshotDate.toISOString().split("T")[0],
      trust_score: this.trustScore,
      status: this.status,
      badge_level: this.badgeLevel,
      event_count: this.eventCount,
      verification_count: this.verificationCount,
      metadata: this.metadata,
      created_at: this.createdAt.toISOString(),
    };
  }
}
