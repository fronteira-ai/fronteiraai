import type { TrustEventRecord } from "../types/trust.types";
import type { TrustEventType, TrustSource, TrustReason } from "../types/enums";

export type CreateTrustEventInput = {
  merchant_id: string;
  merchant_trust_id?: string;
  event_type: TrustEventType;
  source: TrustSource;
  reason?: TrustReason;
  delta?: number;
  score_before?: number;
  score_after?: number;
  metadata?: Record<string, unknown>;
  created_by?: string;
};

export interface ITrustEventRepository {
  findByMerchantId(merchantId: string, limit?: number): Promise<TrustEventRecord[]>;
  findByType(eventType: TrustEventType, limit?: number): Promise<TrustEventRecord[]>;
  create(input: CreateTrustEventInput): Promise<TrustEventRecord | null>;
}
