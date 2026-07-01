import type { Connector } from "../domain/Connector";
import type { ConnectorMetadata } from "../types/connector.types";
import type { ConnectorStatus } from "../types/enums";

export interface IConnectorRepository {
  /** Upserts by connector_key (metadata.id) — keeps the persisted row's config/status intact across syncs. */
  upsertFromMetadata(metadata: ConnectorMetadata): Promise<Connector | null>;
  findByKey(connectorKey: string): Promise<Connector | null>;
  findById(id: string): Promise<Connector | null>;
  list(): Promise<Connector[]>;
  updateStatus(id: string, status: ConnectorStatus): Promise<Connector | null>;
}
