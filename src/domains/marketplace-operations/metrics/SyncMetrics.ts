import type { SupabaseClient } from "@supabase/supabase-js";

export interface SyncRateMetrics {
  syncsPerHour: number;
  priceUpdatesPerHour: number;
}

// "Stock updates/hour" (brief, Epic 6) is deliberately absent — this
// codebase only tracks price changes over time (price_history.recorded_at);
// there is no stock-level history table, so a per-hour stock-update rate
// would have no real data source. Documented gap, not invented from
// offers.updated_at (which conflates price/stock/description/image changes
// and can't be attributed to stock alone). See TECH_DEBT.md.
export async function getSyncRateMetrics(client: SupabaseClient): Promise<SyncRateMetrics> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [runsRes, priceHistoryRes] = await Promise.all([
    client.from("connector_sync_runs").select("id", { count: "exact", head: true }).gte("started_at", since),
    client.from("price_history").select("id", { count: "exact", head: true }).gte("recorded_at", since),
  ]);

  return {
    syncsPerHour: runsRes.count ?? 0,
    priceUpdatesPerHour: priceHistoryRes.count ?? 0,
  };
}
