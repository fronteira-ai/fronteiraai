import type { ConnectorBatch, RawOfferStream } from "./raw.types";
import type { ConnectorType } from "./enums";
import type { ConnectorCapabilities } from "./capability.types";

export interface ConnectorMetadata {
  id: string;
  name: string;
  version: string;
  type: ConnectorType;
  storeSlug: string;
  description?: string;
  /** Wave 5 (Connector Platform V2) — required so every connector, old or
   * new, declares honestly what it provides. See capability.types.ts. */
  capabilities: ConnectorCapabilities;
}

export interface ConnectorFetchOptions {
  /** Wave 6 (Program B — Wave 2) — threaded from `SyncRunOptions.dryRun` so a
   * connector with its own side effects (e.g. the Delta Import Engine's
   * `connector_url_snapshots` writes) can honor "dry-run never writes"
   * without needing dryRun-awareness baked into every implementation —
   * optional and ignorable, existing connectors need no change. */
  dryRun?: boolean;
}

export interface IConnector {
  readonly metadata: ConnectorMetadata;
  fetch(options?: ConnectorFetchOptions): Promise<ConnectorBatch>;
  /** Mission Ω-Pipeline (Scalable Connector Architecture) — optional so every
   * existing connector (and every test/certification caller still using
   * `fetch()`) is byte-identical in behavior. When present, ManualSyncTrigger
   * prefers this path and feeds SyncOrchestrator.runStream() directly, so a
   * catalog of any size is fetched/parsed/persisted in bounded-size batches
   * instead of materializing the whole catalog in memory first. */
  fetchStream?(options?: ConnectorFetchOptions): RawOfferStream;
}
