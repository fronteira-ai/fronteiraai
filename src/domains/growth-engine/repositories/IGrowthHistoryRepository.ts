import type { GrowthHistoryEntry } from "../types/growth.types";
import type { GrowthEventType } from "../types/enums";

export interface IGrowthHistoryRepository {
  getTimeline(merchantId: string, limit: number): Promise<GrowthHistoryEntry[]>;
  recordEvent(
    merchantId: string,
    recommendationId: string,
    strategyId: string,
    category: string,
    title: string,
    eventType: GrowthEventType,
    metadata?: Record<string, unknown>
  ): Promise<void>;
}
