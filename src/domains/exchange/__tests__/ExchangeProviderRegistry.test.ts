import { ExchangeProviderRegistryImpl } from "../providers/ExchangeProviderRegistry";
import type { IExchangeRateProvider } from "../providers/IExchangeRateProvider";

function makeProvider(id: string, priority: number): IExchangeRateProvider {
  return { id, name: id, priority, fetchRates: jest.fn() };
}

describe("ExchangeProviderRegistryImpl", () => {
  it("registers and retrieves a provider by id", () => {
    const registry = new ExchangeProviderRegistryImpl();
    const provider = makeProvider("a", 1);
    registry.register(provider);
    expect(registry.get("a")).toBe(provider);
    expect(registry.has("a")).toBe(true);
  });

  it("throws when registering a duplicate id", () => {
    const registry = new ExchangeProviderRegistryImpl();
    registry.register(makeProvider("dup", 1));
    expect(() => registry.register(makeProvider("dup", 2))).toThrow();
  });

  it("throws on get() for an unknown id", () => {
    const registry = new ExchangeProviderRegistryImpl();
    expect(() => registry.get("missing")).toThrow();
  });

  it("list() returns providers sorted ascending by priority", () => {
    const registry = new ExchangeProviderRegistryImpl();
    registry.register(makeProvider("second", 2));
    registry.register(makeProvider("first", 1));
    registry.register(makeProvider("third", 3));

    expect(registry.list().map((p) => p.id)).toEqual(["first", "second", "third"]);
  });

  it("unregister removes a provider", () => {
    const registry = new ExchangeProviderRegistryImpl();
    registry.register(makeProvider("a", 1));
    registry.unregister("a");
    expect(registry.has("a")).toBe(false);
  });
});
