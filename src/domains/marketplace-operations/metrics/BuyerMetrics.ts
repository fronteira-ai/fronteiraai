import type { SupabaseClient } from "@supabase/supabase-js";

export interface BuyerVolumeMetrics {
  buyerSessions: number;
  buyerEvents: number;
  /** Per-store buyer_events count in the last 30 days, keyed by store_id — feeds MerchantPriorityService's popularity factor. */
  eventsByStore: Map<string, number>;
}

export async function getBuyerVolumeMetrics(client: SupabaseClient): Promise<BuyerVolumeMetrics> {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [sessionsRes, eventsRes, recentEventsRes] = await Promise.all([
    client.from("buyer_sessions").select("id", { count: "exact", head: true }),
    client.from("buyer_events").select("id", { count: "exact", head: true }),
    client.from("buyer_events").select("store_id").gte("occurred_at", since30d).not("store_id", "is", null),
  ]);

  const eventsByStore = new Map<string, number>();
  for (const row of (recentEventsRes.data ?? []) as { store_id: string | null }[]) {
    if (!row.store_id) continue;
    eventsByStore.set(row.store_id, (eventsByStore.get(row.store_id) ?? 0) + 1);
  }

  return {
    buyerSessions: sessionsRes.count ?? 0,
    buyerEvents: eventsRes.count ?? 0,
    eventsByStore,
  };
}
