import { exchangeProviderRegistry } from "./ExchangeProviderRegistry";
import { ExchangeRateApiProvider } from "./ExchangeRateApiProvider";

// Idempotent by construction (checks has() first) — safe to call defensively
// from the factory on every request, same spirit as bootstrapConnectors()
// in src/domains/connectors/crawler/bootstrap.ts. Registering a 2nd/3rd
// provider in the future is one more line here, no other change needed.
export function bootstrapExchangeProviders(): void {
  if (!exchangeProviderRegistry.has("exchangerate-api")) {
    exchangeProviderRegistry.register(new ExchangeRateApiProvider());
  }
}
