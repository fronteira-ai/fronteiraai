// Delta Engine persistence contract (Program Σ, Mission Σ-2 — generalized
// from IConnectorUrlSnapshotRepository, Release 1.8 Program B Wave 2). Lives
// inside connectors/ (unlike the Certification/Observability facades) —
// this is a purely internal Connector Platform concern, no other domain
// reads or writes it, so no circular-dependency risk to route around.

export interface DeltaStateEntry {
  key: string;
  checkpoint: string;
}

export interface IDeltaStateRepository {
  /** All known (key -> checkpoint) pairs for a connector, as a Map for O(1)
   * lookup while planning a run — never one query per key. */
  getCheckpoints(connectorId: string): Promise<Map<string, string>>;

  /** Upsert-by-(connectorId, key) for every entry — called once after a
   * discovery pass, with the *current* checkpoint of everything seen
   * (fetched or skipped), so the next run's comparison is against this
   * run's truth. */
  saveCheckpoints(connectorId: string, entries: DeltaStateEntry[]): Promise<void>;
}
