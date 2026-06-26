import type { ConnectorBatch } from "./raw";

export type ConnectorType =
  | "json-file"
  | "csv-file"
  | "api-rest"
  | "xml-file"
  | "erp"
  | "manual-upload"
  | "crawler";

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
