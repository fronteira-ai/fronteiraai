import { TrustEventType, TrustSource, TrustReason } from "../types/enums";
import type { TrustEventRecord } from "../types/trust.types";

export class TrustEvent {
  readonly id: string;
  readonly merchantId: string;
  readonly merchantTrustId: string | null;
  readonly eventType: TrustEventType;
  readonly source: TrustSource;
  readonly reason: TrustReason | null;
  readonly delta: number;
  readonly scoreBefore: number | null;
  readonly scoreAfter: number | null;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Date;
  readonly createdBy: string | null;

  private constructor(record: TrustEventRecord) {
    this.id = record.id;
    this.merchantId = record.merchant_id;
    this.merchantTrustId = record.merchant_trust_id;
    this.eventType = record.event_type as TrustEventType;
    this.source = record.source as TrustSource;
    this.reason = record.reason as TrustReason | null;
    this.delta = record.delta;
    this.scoreBefore = record.score_before;
    this.scoreAfter = record.score_after;
    this.metadata = record.metadata;
    this.createdAt = new Date(record.created_at);
    this.createdBy = record.created_by;
  }

  static fromRecord(record: TrustEventRecord): TrustEvent {
    return new TrustEvent(record);
  }

  hadScoreChange(): boolean {
    return this.delta !== 0;
  }

  wasSystemGenerated(): boolean {
    return this.source === TrustSource.System;
  }

  toRecord(): TrustEventRecord {
    return {
      id: this.id,
      merchant_id: this.merchantId,
      merchant_trust_id: this.merchantTrustId,
      event_type: this.eventType,
      source: this.source,
      reason: this.reason,
      delta: this.delta,
      score_before: this.scoreBefore,
      score_after: this.scoreAfter,
      metadata: this.metadata,
      created_at: this.createdAt.toISOString(),
      created_by: this.createdBy,
    };
  }
}
