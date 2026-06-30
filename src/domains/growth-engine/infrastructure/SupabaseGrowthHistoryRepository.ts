import type { SupabaseClient } from "@supabase/supabase-js";
import type { IGrowthHistoryRepository } from "../repositories/IGrowthHistoryRepository";
import type { GrowthHistoryEntry } from "../types/growth.types";
import type { GrowthEventType } from "../types/enums";

export class SupabaseGrowthHistoryRepository implements IGrowthHistoryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getTimeline(merchantId: string, limit: number): Promise<GrowthHistoryEntry[]> {
    const { data, error } = await this.client
      .from("merchant_growth_history")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[GrowthHistory] getTimeline error:", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      merchant_id: row.merchant_id,
      recommendation_id: row.recommendation_id,
      strategy_id: row.strategy_id,
      category: row.category,
      title: row.title,
      event_type: row.event_type,
      occurred_at: row.occurred_at,
      metadata: row.metadata ?? {},
    }));
  }

  async recordEvent(
    merchantId: string,
    recommendationId: string,
    strategyId: string,
    category: string,
    title: string,
    eventType: GrowthEventType,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const { error } = await this.client.from("merchant_growth_history").insert({
      merchant_id: merchantId,
      recommendation_id: recommendationId,
      strategy_id: strategyId,
      category,
      title,
      event_type: eventType,
      occurred_at: new Date().toISOString(),
      metadata,
    });

    if (error) {
      console.error("[GrowthHistory] recordEvent error:", error.message);
    }
  }
}
