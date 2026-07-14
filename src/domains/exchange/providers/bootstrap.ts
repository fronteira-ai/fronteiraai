import { exchangeProviderRegistry } from "./ExchangeProviderRegistry";
import { ExchangeRateApiProvider } from "./ExchangeRateApiProvider";
import { OpenExchangeRatesProvider } from "./OpenExchangeRatesProvider";

// Idempotent by construction (checks has() first) — safe to call defensively
// from the factory on every request, same spirit as bootstrapConnectors()
// in src/domains/connectors/crawler/bootstrap.ts. Registering a 2nd/3rd
// provider in the future is one more line here, no other change needed —
// Program ΔR — Mission ΔR-1.1 (Objetivo 7) is exactly that one more line,
// giving the already-built failover in ExchangeRateService.refresh() a
// real second provider to fall over to for the first time.
export function bootstrapExchangeProviders(): void {
  if (!exchangeProviderRegistry.has("exchangerate-api")) {
    exchangeProviderRegistry.register(new ExchangeRateApiProvider());
  }
  if (!exchangeProviderRegistry.has("open-exchange-rates")) {
    exchangeProviderRegistry.register(new OpenExchangeRatesProvider());
  }
}
