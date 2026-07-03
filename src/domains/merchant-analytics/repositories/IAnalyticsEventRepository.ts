import type { AnalyticsEventPayload, StoredAnalyticsEvent } from "../types/analytics.types";
import type { AnalyticsEventType, AnalyticsWindow } from "../types/enums";

export interface IAnalyticsEventRepository {
  insert(event: AnalyticsEventPayload): Promise<StoredAnalyticsEvent | null>;
  insertBatch(events: AnalyticsEventPayload[]): Promise<StoredAnalyticsEvent[]>;
  countByType(
    eventType: AnalyticsEventType,
    since: Date,
    merchantId?: string
  ): Promise<number>;
  findBySession(sessionId: string, limit?: number): Promise<StoredAnalyticsEvent[]>;
  findByMerchant(
    merchantId: string,
    window: AnalyticsWindow,
    limit?: number
  ): Promise<StoredAnalyticsEvent[]>;
  findByProduct(
    productId: string,
    window: AnalyticsWindow
  ): Promise<StoredAnalyticsEvent[]>;
  countRecent(sinceMinutes: number): Promise<number>;
}
