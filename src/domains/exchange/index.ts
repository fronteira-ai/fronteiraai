// Public API of the Exchange domain (Release 1.8 — Program A — Wave 1).
// Never depends on other domains — every domain that displays a price can
// depend on this one. Import from here rather than reaching into subfolders.

export * from "./types";
export * from "./enums";

export type { IExchangeRateProvider } from "./providers/IExchangeRateProvider";
export { ExchangeRateApiProvider } from "./providers/ExchangeRateApiProvider";
export { OpenExchangeRatesProvider } from "./providers/OpenExchangeRatesProvider";
export { ExchangeProviderRegistryImpl, exchangeProviderRegistry } from "./providers/ExchangeProviderRegistry";
export { bootstrapExchangeProviders } from "./providers/bootstrap";

export { ExchangeRateCache, EXCHANGE_RATE_CACHE_TTL_MS } from "./cache/ExchangeRateCache";

export type { IExchangeRateRepository, CreateExchangeRateInput } from "./repositories/IExchangeRateRepository";
export type {
  IExchangeProviderRunRepository,
  CreateProviderRunInput,
  ProviderRun,
  ProviderRunStatus,
} from "./repositories/IExchangeProviderRunRepository";
export type {
  IExchangeConversionLogRepository,
  CreateConversionLogInput,
} from "./repositories/IExchangeConversionLogRepository";

export { SupabaseExchangeRateRepository } from "./infrastructure/SupabaseExchangeRateRepository";
export { SupabaseExchangeProviderRunRepository } from "./infrastructure/SupabaseExchangeProviderRunRepository";
export { SupabaseExchangeConversionLogRepository } from "./infrastructure/SupabaseExchangeConversionLogRepository";

export { ExchangeHistoryService } from "./history/ExchangeHistoryService";
export { ExchangeRateService } from "./services/ExchangeRateService";
export type { RefreshResult } from "./services/ExchangeRateService";
export { AutomaticCurrencyService } from "./services/AutomaticCurrencyService";
export type { ConvertInput } from "./services/AutomaticCurrencyService";
export { ExchangeProviderHealthService, buildProviderHealthSnapshot } from "./services/ExchangeProviderHealthService";
export { computeSystemExchangeStatus, SystemExchangeStatus } from "./services/SystemExchangeStatusService";
export type { SystemExchangeStatusResult } from "./services/SystemExchangeStatusService";

export * as ExchangeAnalyticsFormulas from "./analytics/formulas";
export { ExchangeAnalyticsService } from "./analytics/ExchangeAnalyticsService";
export type { ExchangeAnalyticsSnapshot } from "./analytics/ExchangeAnalyticsService";

export { ExchangeDashboardService } from "./dashboard/ExchangeDashboardService";
export type { ExchangeOverview } from "./dashboard/ExchangeDashboardService";

export type { ExchangeDomainEvent } from "./events/ExchangeDomainEvent";
