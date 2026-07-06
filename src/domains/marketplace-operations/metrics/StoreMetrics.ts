import type { SupabaseClient } from "@supabase/supabase-js";

export interface StoreCounts {
  total: number;
  discovered: number;
  synced: number;
  claimed: number;
}

// Computed on read from existing tables (stores, store_claims, connectors,
// connector_sync_runs) — no new aggregate table, same discipline as
// merchant_catalog_snapshots/ConnectorHealthSummary elsewhere in this repo.
export async function getStoreCounts(client: SupabaseClient): Promise<StoreCounts> {
  const [totalRes, discoveredRes, claimedRes, connectorsRes, successRunsRes] = await Promise.all([
    client.from("stores").select("id", { count: "exact", head: true }),
    client.from("stores").select("id", { count: "exact", head: true }).not("discovery_connector_key", "is", null),
    client.from("store_claims").select("store_id").eq("status", "approved"),
    client.from("connectors").select("id, store_slug"),
    client.from("connector_sync_runs").select("connector_id").eq("status", "success"),
  ]);

  const claimedStoreIds = new Set((claimedRes.data ?? []).map((r: { store_id: string }) => r.store_id));

  const connectorSlugById = new Map(
    (connectorsRes.data ?? []).map((c: { id: string; store_slug: string }) => [c.id, c.store_slug])
  );
  const syncedSlugs = new Set(
    (successRunsRes.data ?? [])
      .map((r: { connector_id: string }) => connectorSlugById.get(r.connector_id))
      .filter((slug): slug is string => Boolean(slug))
  );

  return {
    total: totalRes.count ?? 0,
    discovered: discoveredRes.count ?? 0,
    synced: syncedSlugs.size,
    claimed: claimedStoreIds.size,
  };
}

export interface StoreCityGroup {
  city: string;
  storeCount: number;
}

export async function getStoresByCity(client: SupabaseClient): Promise<StoreCityGroup[]> {
  const { data } = await client.from("stores").select("city");
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { city: string | null }[]) {
    const city = row.city?.trim() || "Não informado";
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([city, storeCount]) => ({ city, storeCount }))
    .sort((a, b) => b.storeCount - a.storeCount);
}
