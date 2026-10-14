import { exchangeProviderRegistry } from "./ExchangeProviderRegistry";
import { ExchangeRateApiProvider } from "./ExchangeRateApiProvider";
import { OpenExchangeRatesProvider } from "./OpenExchangeRatesProvider";
import { KeylessExchangeRateProvider } from "./KeylessExchangeRateProvider";

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
  // Mission 05.19 — terceiro provider, SEM CHAVE. Fica por último (priority 3):
  // enquanto nenhuma credencial existir, os dois primeiros falham no `refresh()`
  // e o failover chega neste, dando câmbio funcional sem NENHUMA configuração
  // nova. Se uma chave for definida depois, o provider pago volta a preceder sem
  // alteração de código.
  if (!exchangeProviderRegistry.has("keyless-open-er-api")) {
    exchangeProviderRegistry.register(new KeylessExchangeRateProvider());
  }
}
