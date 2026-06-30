import type { IGrowthHistoryRepository } from "../repositories/IGrowthHistoryRepository";
import type { GrowthRecommendation, GrowthTimeline } from "../types/growth.types";
import type { GrowthEventType } from "../types/enums";

export class GrowthHistoryService {
  constructor(private readonly repo: IGrowthHistoryRepository) {}

  async getTimeline(merchantId: string, limit = 50): Promise<GrowthTimeline> {
    const entries = await this.repo.getTimeline(merchantId, limit);
    return {
      merchant_id: merchantId,
      entries,
      total: entries.length,
      generated_at: new Date().toISOString(),
    };
  }

  async recordEvent(merchantId: string, rec: GrowthRecommendation, eventType: GrowthEventType): Promise<void> {
    await this.repo.recordEvent(
      merchantId,
      rec.id,
      rec.strategy_id,
      rec.category,
      rec.title,
      eventType,
      { priority_score: rec.priority_score, plan_tier: rec.plan_tier }
    );
  }
}
