import type { ConnectorType, ConnectorStatus } from "../types/enums";

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
}
