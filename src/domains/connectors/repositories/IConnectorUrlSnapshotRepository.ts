// Delta Import Engine persistence (Release 1.8 — Program B — Wave 2). Lives
// inside connectors/ (unlike the Certification/Observability facades) —
// this is a purely internal Connector Platform concern, no other domain
// reads or writes it, so no circular-dependency risk to route around.

export interface UrlSnapshotEntry {
  url: string;
  lastmod: string;
}

export interface IConnectorUrlSnapshotRepository {
  /** All known (url -> lastmod) pairs for a connector, as a Map for O(1)
   * lookup while planning a run — never one query per URL. */
  getSnapshotMap(connectorId: string): Promise<Map<string, string>>;

  /** Upsert-by-(connectorId, url) for every entry — called once after a
   * sitemap walk, with the *current* lastmod of everything seen (fetched or
   * skipped), so the next run's comparison is against this run's truth. */
  saveSnapshots(connectorId: string, entries: UrlSnapshotEntry[]): Promise<void>;
}
