import type { SupabaseClient } from "@supabase/supabase-js";
import type { IConnectorUrlSnapshotRepository, UrlSnapshotEntry } from "../repositories/IConnectorUrlSnapshotRepository";

const UPSERT_CHUNK_SIZE = 500;

export class SupabaseConnectorUrlSnapshotRepository implements IConnectorUrlSnapshotRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getSnapshotMap(connectorId: string): Promise<Map<string, string>> {
    const map = new Map<string, string>();

    const { data, error } = await this.client
      .from("connector_url_snapshots")
      .select("url, lastmod")
      .eq("connector_id", connectorId);

    if (error) {
      console.error("[SupabaseConnectorUrlSnapshotRepository.getSnapshotMap]", error.message);
      return map;
    }

    for (const row of (data ?? []) as { url: string; lastmod: string }[]) {
      map.set(row.url, row.lastmod);
    }
    return map;
  }

  async saveSnapshots(connectorId: string, entries: UrlSnapshotEntry[]): Promise<void> {
    if (entries.length === 0) return;

    // Chunked — a full-catalog sitemap can be tens of thousands of URLs
    // (Roma Shopping's ~50k estimated), past what a single upsert call
    // should carry.
    for (let i = 0; i < entries.length; i += UPSERT_CHUNK_SIZE) {
      const chunk = entries.slice(i, i + UPSERT_CHUNK_SIZE).map((e) => ({
        connector_id: connectorId,
        url: e.url,
        lastmod: e.lastmod,
        last_fetched_at: new Date().toISOString(),
      }));

      const { error } = await this.client
        .from("connector_url_snapshots")
        .upsert(chunk, { onConflict: "connector_id,url" });

      if (error) {
        console.error("[SupabaseConnectorUrlSnapshotRepository.saveSnapshots]", error.message);
      }
    }
  }
}
