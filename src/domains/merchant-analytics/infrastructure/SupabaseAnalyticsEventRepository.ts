import type { SupabaseClient } from "@supabase/supabase-js";
import type { IAnalyticsEventRepository } from "../repositories/IAnalyticsEventRepository";
import type { AnalyticsEventPayload, StoredAnalyticsEvent } from "../types/analytics.types";
import type { AnalyticsEventType, AnalyticsWindow } from "../types/enums";
import { windowToDate } from "../services/WindowHelper";

export class SupabaseAnalyticsEventRepository implements IAnalyticsEventRepository {
  constructor(private readonly client: SupabaseClient) {}

  async insert(event: AnalyticsEventPayload): Promise<StoredAnalyticsEvent | null> {
    const { data, error } = await this.client
      .from("buyer_events")
      .insert({
        event_type: event.event_type,
        session_id: event.session_id ?? null,
        buyer_id: event.buyer_id ?? null,
        anonymous_id: event.anonymous_id,
        merchant_id: event.merchant_id ?? null,
        store_id: event.store_id ?? null,
        product_id: event.product_id ?? null,
        search_query: event.search_query ?? null,
        page_url: event.page_url,
        referrer: event.referrer ?? null,
        metadata: event.metadata ?? {},
        occurred_at: event.occurred_at ?? new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[SupabaseAnalyticsEventRepository.insert]", error.message);
      return null;
    }
    return data as StoredAnalyticsEvent;
  }

  async insertBatch(events: AnalyticsEventPayload[]): Promise<StoredAnalyticsEvent[]> {
    if (events.length === 0) return [];

    const rows = events.map((e) => ({
      event_type: e.event_type,
      session_id: e.session_id ?? null,
      buyer_id: e.buyer_id ?? null,
      anonymous_id: e.anonymous_id,
      merchant_id: e.merchant_id ?? null,
      store_id: e.store_id ?? null,
      product_id: e.product_id ?? null,
      search_query: e.search_query ?? null,
      page_url: e.page_url,
      referrer: e.referrer ?? null,
      metadata: e.metadata ?? {},
      occurred_at: e.occurred_at ?? new Date().toISOString(),
    }));

    // .select() so the caller (EventPlatformService) gets real row ids back —
    // needed to feed BuyerEventBrainBridgeService (Release 1.8, Program 0
    // Wave 0) without a second round-trip to re-query what was just inserted.
    const { data, error } = await this.client
      .from("buyer_events")
      .insert(rows)
      .select();

    if (error) {
      console.error("[SupabaseAnalyticsEventRepository.insertBatch]", error.message);
      return [];
    }
    return (data ?? []) as StoredAnalyticsEvent[];
  }

  async countByType(
    eventType: AnalyticsEventType,
    since: Date,
    merchantId?: string
  ): Promise<number> {
    let q = this.client
      .from("buyer_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", eventType)
      .gte("occurred_at", since.toISOString());

    if (merchantId) q = q.eq("merchant_id", merchantId);

    const { count, error } = await q;
    if (error) {
      console.error("[SupabaseAnalyticsEventRepository.countByType]", error.message);
      return 0;
    }
    return count ?? 0;
  }

  async findBySession(sessionId: string, limit = 100): Promise<StoredAnalyticsEvent[]> {
    const { data, error } = await this.client
      .from("buyer_events")
      .select("*")
      .eq("session_id", sessionId)
      .order("occurred_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[SupabaseAnalyticsEventRepository.findBySession]", error.message);
      return [];
    }
    return (data ?? []) as unknown as StoredAnalyticsEvent[];
  }

  async findByMerchant(
    merchantId: string,
    window: AnalyticsWindow,
    limit = 500
  ): Promise<StoredAnalyticsEvent[]> {
    const since = windowToDate(window);
    const { data, error } = await this.client
      .from("buyer_events")
      .select("*")
      .eq("merchant_id", merchantId)
      .gte("occurred_at", since.toISOString())
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[SupabaseAnalyticsEventRepository.findByMerchant]", error.message);
      return [];
    }
    return (data ?? []) as unknown as StoredAnalyticsEvent[];
  }

  async findByProduct(productId: string, window: AnalyticsWindow): Promise<StoredAnalyticsEvent[]> {
    const since = windowToDate(window);
    const { data, error } = await this.client
      .from("buyer_events")
      .select("*")
      .eq("product_id", productId)
      .gte("occurred_at", since.toISOString())
      .order("occurred_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[SupabaseAnalyticsEventRepository.findByProduct]", error.message);
      return [];
    }
    return (data ?? []) as unknown as StoredAnalyticsEvent[];
  }

  async countRecent(sinceMinutes: number): Promise<number> {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    const { count, error } = await this.client
      .from("buyer_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since.toISOString());

    if (error) return 0;
    return count ?? 0;
  }
}
