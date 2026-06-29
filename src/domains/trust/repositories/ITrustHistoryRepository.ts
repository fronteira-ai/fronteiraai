import type { TrustHistoryRecord } from "../types/trust.types";

export interface ITrustHistoryRepository {
  findByMerchantId(merchantId: string, limit?: number): Promise<TrustHistoryRecord[]>;
  findLatest(merchantId: string): Promise<TrustHistoryRecord | null>;
  createSnapshot(
    merchantId: string,
    trustScore: number,
    status: string,
    badgeLevel: string | null,
    eventCount: number,
    verificationCount: number
  ): Promise<TrustHistoryRecord | null>;
}
