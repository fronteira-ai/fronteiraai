import type { IConnector, ConnectorMetadata } from "../types/connector.types";
import type { ConnectorCapabilities } from "../types/capability.types";

// Connector Platform V2 (Wave 5) — deliberately stays a pure in-memory index
// of currently-loaded code (register/discover), never gains a DB dependency.
// "Status"/"certification"/"metrics" queries are live, persisted data, owned
// by ConnectorHealthService/the certification aggregator — mixing that I/O
// into this class would violate the single responsibility that makes it
// trivially testable today (ConnectorRegistry.test.ts has zero mocks).
// `ConnectorDirectoryService` (services/ConnectorDirectoryService.ts) is the
// facade that answers "capability + status + certification + metrics" for
// every connector in one call, composing this registry with those services
// — see docs/engineering/CONNECTOR_PLATFORM_V2.md §2.
export class ConnectorRegistryImpl {
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

  listMetadata(): ConnectorMetadata[] {
    return this.list().map((c) => c.metadata);
  }

  /** Discover connectors by declared capability — e.g. `findByCapability(c
   * => c.supportsExchange)` for every connector whose currency data is
   * reliable enough to feed Exchange Intelligence. */
  findByCapability(predicate: (capabilities: ConnectorCapabilities) => boolean): IConnector[] {
    return this.list().filter((c) => predicate(c.metadata.capabilities));
  }

  has(id: string): boolean {
    return this.connectors.has(id);
  }

  unregister(id: string): void {
    this.connectors.delete(id);
  }
}

export const connectorRegistry = new ConnectorRegistryImpl();
