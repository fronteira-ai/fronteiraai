import type { SupabaseClient } from "@supabase/supabase-js";
import type { IDeltaStateRepository, DeltaStateEntry } from "../repositories/IDeltaStateRepository";

const UPSERT_CHUNK_SIZE = 500;

// Generalized from SupabaseConnectorUrlSnapshotRepository (Release 1.8
// Program B Wave 2). Table/column names are retained as-is
// (`connector_url_snapshots.url`/`.lastmod`) — renaming them would require a
// migration, which this Mission (Σ-2) does not authorize; the generic
// `key`/`checkpoint` domain vocabulary is mapped to the existing storage
// shape entirely inside this adapter, so callers of `IDeltaStateRepository`
// never see the storage-level names.
export class SupabaseDeltaStateRepository implements IDeltaStateRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getCheckpoints(connectorId: string): Promise<Map<string, string>> {
    const map = new Map<string, string>();

    const { data, error } = await this.client
      .from("connector_url_snapshots")
      .select("url, lastmod")
      .eq("connector_id", connectorId);

    if (error) {
      console.error("[SupabaseDeltaStateRepository.getCheckpoints]", error.message);
      return map;
    }

    for (const row of (data ?? []) as { url: string; lastmod: string }[]) {
      map.set(row.url, row.lastmod);
    }
    return map;
  }

  async saveCheckpoints(connectorId: string, entries: DeltaStateEntry[]): Promise<void> {
    if (entries.length === 0) return;

    // Chunked — a full-catalog sitemap can be tens of thousands of keys
    // (Roma Shopping's ~50k estimated), past what a single upsert call
    // should carry.
    for (let i = 0; i < entries.length; i += UPSERT_CHUNK_SIZE) {
      const chunk = entries.slice(i, i + UPSERT_CHUNK_SIZE).map((e) => ({
        connector_id: connectorId,
        url: e.key,
        lastmod: e.checkpoint,
        last_fetched_at: new Date().toISOString(),
      }));

      const { error } = await this.client
        .from("connector_url_snapshots")
        .upsert(chunk, { onConflict: "connector_id,url" });

      if (error) {
        console.error("[SupabaseDeltaStateRepository.saveCheckpoints]", error.message);
      }
    }
  }
}
