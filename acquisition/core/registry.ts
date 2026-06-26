import type { IConnector } from "../types/connector";

class ConnectorRegistryImpl {
  private readonly connectors = new Map<string, IConnector>();

  register(connector: IConnector): void {
    if (this.connectors.has(connector.metadata.id)) {
      throw new Error(`Connector already registered: ${connector.metadata.id}`);
    }
    this.connectors.set(connector.metadata.id, connector);
    console.log(`[registry] Registered: ${connector.metadata.id} (${connector.metadata.type})`);
  }

  get(id: string): IConnector {
    const connector = this.connectors.get(id);
    if (!connector) throw new Error(`Connector not found: ${id}`);
    return connector;
  }

  list(): IConnector[] {
    return [...this.connectors.values()];
  }

  has(id: string): boolean {
    return this.connectors.has(id);
  }

  unregister(id: string): void {
    this.connectors.delete(id);
  }
}

export const connectorRegistry = new ConnectorRegistryImpl();
