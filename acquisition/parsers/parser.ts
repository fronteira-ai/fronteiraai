import type { ConnectorBatch } from "../types/raw";

export interface IParser {
  readonly format: string;
  parse(content: string, connectorId: string, storeSlug: string): ConnectorBatch;
}
