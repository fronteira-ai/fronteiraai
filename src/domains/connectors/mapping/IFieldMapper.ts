import type { ConnectorBatch } from "../types/raw.types";

export interface IFieldMapper {
  readonly format: string;
  parse(content: string, connectorId: string, storeSlug: string): ConnectorBatch;
}
