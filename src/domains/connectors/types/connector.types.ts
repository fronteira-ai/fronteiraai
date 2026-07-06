import type { ConnectorBatch } from "./raw.types";
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
}
