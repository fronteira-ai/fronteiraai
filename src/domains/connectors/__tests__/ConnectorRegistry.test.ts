import { ConnectorRegistryImpl } from "../services/ConnectorRegistry";
import { makeConnectorMetadata } from "./helpers";
import type { IConnector } from "../types/connector.types";

function makeConnector(id: string): IConnector {
  return {
    metadata: makeConnectorMetadata({ id }),
    fetch: jest.fn(),
  };
}

describe("ConnectorRegistryImpl", () => {
  it("registers and retrieves a connector by id", () => {
    const registry = new ConnectorRegistryImpl();
    const connector = makeConnector("a");
    registry.register(connector);
    expect(registry.get("a")).toBe(connector);
    expect(registry.has("a")).toBe(true);
  });

  it("lists all registered connectors", () => {
    const registry = new ConnectorRegistryImpl();
    registry.register(makeConnector("a"));
    registry.register(makeConnector("b"));
    expect(registry.list().length).toBe(2);
  });

  it("throws on get() for an unknown id", () => {
    const registry = new ConnectorRegistryImpl();
    expect(() => registry.get("missing")).toThrow();
  });

  it("throws when registering a duplicate id", () => {
    const registry = new ConnectorRegistryImpl();
    registry.register(makeConnector("dup"));
    expect(() => registry.register(makeConnector("dup"))).toThrow();
  });

  it("unregister removes a connector", () => {
    const registry = new ConnectorRegistryImpl();
    registry.register(makeConnector("a"));
    registry.unregister("a");
    expect(registry.has("a")).toBe(false);
  });

  it("listMetadata returns just the metadata of every registered connector", () => {
    const registry = new ConnectorRegistryImpl();
    registry.register(makeConnector("a"));
    registry.register(makeConnector("b"));
    expect(registry.listMetadata().map((m) => m.id).sort()).toEqual(["a", "b"]);
  });

  it("findByCapability filters connectors by a predicate over their declared capabilities", () => {
    const registry = new ConnectorRegistryImpl();
    const exchangeCapable: IConnector = {
      metadata: makeConnectorMetadata({ id: "x", capabilities: { ...makeConnector("x").metadata.capabilities, supportsExchange: true } }),
      fetch: jest.fn(),
    };
    const notExchangeCapable = makeConnector("y");

    registry.register(exchangeCapable);
    registry.register(notExchangeCapable);

    const result = registry.findByCapability((c) => c.supportsExchange);
    expect(result.map((c) => c.metadata.id)).toEqual(["x"]);
  });
});
