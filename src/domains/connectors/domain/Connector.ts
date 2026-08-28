import type { ConnectorType, ConnectorStatus } from "../types/enums";
import type { ConnectorSyncState } from "../scheduler/AdaptiveSyncEngine";

export interface Connector {
  id: string;
  connectorKey: string;
  name: string;
  version: string;
  type: ConnectorType;
  storeSlug: string;
  description: string | null;
  status: ConnectorStatus;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  /** Adaptive Sync Engine state (Sprint Realtime Commerce Sync V1). */
  syncState?: ConnectorSyncState | null;
}
