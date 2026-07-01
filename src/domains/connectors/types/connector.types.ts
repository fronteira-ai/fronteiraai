import type { ConnectorBatch } from "./raw.types";
import type { ConnectorType } from "./enums";

export interface ConnectorMetadata {
  id: string;
  name: string;
  version: string;
  type: ConnectorType;
  storeSlug: string;
  description?: string;
}

export interface IConnector {
  readonly metadata: ConnectorMetadata;
  fetch(): Promise<ConnectorBatch>;
}
