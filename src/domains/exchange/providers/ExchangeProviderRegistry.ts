import type { IExchangeRateProvider } from "./IExchangeRateProvider";

// Mirrors src/domains/connectors/services/ConnectorRegistry.ts exactly (same
// register/get/list/has/unregister shape), with one addition: list() sorts
// by priority so ExchangeRateService.refresh() can iterate in failover order
// without re-sorting itself. Registering a 2nd/3rd provider in the future is
// purely additive — no refactor needed here.
export class ExchangeProviderRegistryImpl {
  private readonly providers = new Map<string, IExchangeRateProvider>();

  register(provider: IExchangeRateProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Exchange provider already registered: ${provider.id}`);
    }
    this.providers.set(provider.id, provider);
  }

  get(id: string): IExchangeRateProvider {
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`Exchange provider not found: ${id}`);
    return provider;
  }

  list(): IExchangeRateProvider[] {
    return [...this.providers.values()].sort((a, b) => a.priority - b.priority);
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  unregister(id: string): void {
    this.providers.delete(id);
  }
}

export const exchangeProviderRegistry = new ExchangeProviderRegistryImpl();
