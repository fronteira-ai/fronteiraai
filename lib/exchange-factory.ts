import type { SupabaseClient } from "@supabase/supabase-js";
import { bootstrapExchangeProviders } from "@/src/domains/exchange/providers/bootstrap";
import { exchangeProviderRegistry } from "@/src/domains/exchange/providers/ExchangeProviderRegistry";
import { ExchangeRateCache } from "@/src/domains/exchange/cache/ExchangeRateCache";
import { SupabaseExchangeRateRepository } from "@/src/domains/exchange/infrastructure/SupabaseExchangeRateRepository";
import { SupabaseExchangeProviderRunRepository } from "@/src/domains/exchange/infrastructure/SupabaseExchangeProviderRunRepository";
import { SupabaseExchangeConversionLogRepository } from "@/src/domains/exchange/infrastructure/SupabaseExchangeConversionLogRepository";
import { ExchangeRateService } from "@/src/domains/exchange/services/ExchangeRateService";
import { AutomaticCurrencyService } from "@/src/domains/exchange/services/AutomaticCurrencyService";
import { ExchangeProviderHealthService } from "@/src/domains/exchange/services/ExchangeProviderHealthService";
import { ExchangeHistoryService } from "@/src/domains/exchange/history/ExchangeHistoryService";
import { ExchangeAnalyticsService } from "@/src/domains/exchange/analytics/ExchangeAnalyticsService";
import { ExchangeDashboardService } from "@/src/domains/exchange/dashboard/ExchangeDashboardService";

// Shared across requests within the same process/serverless instance — that
// is the entire point of a TTL cache (ExchangeRateCache's doc comment). A
// fresh instance per factory call would defeat it completely.
const sharedCache = new ExchangeRateCache();

export function createExchangeServices(client: SupabaseClient) {
  bootstrapExchangeProviders();

  const rateRepo = new SupabaseExchangeRateRepository(client);
  const runRepo = new SupabaseExchangeProviderRunRepository(client);
  const conversionLogRepo = new SupabaseExchangeConversionLogRepository(client);

  const rateService = new ExchangeRateService(exchangeProviderRegistry, rateRepo, runRepo, sharedCache);
  const historyService = new ExchangeHistoryService(rateRepo);
  const currencyService = new AutomaticCurrencyService(rateService, historyService);
  const healthService = new ExchangeProviderHealthService(exchangeProviderRegistry, runRepo);
  const analyticsService = new ExchangeAnalyticsService(client, historyService);
  const dashboardService = new ExchangeDashboardService(
    rateService,
    healthService,
    historyService,
    analyticsService,
    conversionLogRepo
  );

  return {
    rateRepo,
    runRepo,
    conversionLogRepo,
    rateService,
    historyService,
    currencyService,
    healthService,
    analyticsService,
    dashboardService,
  };
}
