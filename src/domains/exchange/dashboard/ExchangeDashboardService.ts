import { CurrencyPair } from "../enums/CurrencyPair";
import type { ExchangeRateService } from "../services/ExchangeRateService";
import type { ExchangeProviderHealthService } from "../services/ExchangeProviderHealthService";
import type { ExchangeHistoryService } from "../history/ExchangeHistoryService";
import type { ExchangeAnalyticsService, ExchangeAnalyticsSnapshot } from "../analytics/ExchangeAnalyticsService";
import type { IExchangeConversionLogRepository } from "../repositories/IExchangeConversionLogRepository";
import type { ExchangeRate } from "../types/Money";
import type { ProviderHealthSnapshot } from "../types/ProviderHealth";
import { computeSystemExchangeStatus, type SystemExchangeStatusResult } from "../services/SystemExchangeStatusService";

type OverviewKey = "currentRates" | "providerHealth" | "history" | "analytics" | "conversionsToday";

export interface ExchangeOverview {
  currentRates: ExchangeRate[] | null;
  providerHealth: ProviderHealthSnapshot[] | null;
  /** last 7 days, USD/PYG */
  history: ExchangeRate[] | null;
  analytics: ExchangeAnalyticsSnapshot | null;
  conversionsToday: number | null;
  /** Program ΔR — Mission ΔR-1.1 (Objetivo 5). System-wide verdict — derived
   * from currentRates/providerHealth above, not a new query. null only when
   * providerHealth itself failed to load (errors.providerHealth is set). */
  systemStatus: SystemExchangeStatusResult | null;
  errors: Partial<Record<OverviewKey, string>>;
  generatedAt: string;
}

const TRACKED_PAIRS = [CurrencyPair.UsdPyg, CurrencyPair.UsdBrl, CurrencyPair.BrlPyg];

// Epic 7 — composition layer for /admin/exchange, same Promise.allSettled +
// index-mapped-fallback isolation as platform-health / the marketplace-
// operations dashboard — one failing sub-section never breaks the payload.
export class ExchangeDashboardService {
  constructor(
    private readonly rateService: ExchangeRateService,
    private readonly healthService: ExchangeProviderHealthService,
    private readonly historyService: ExchangeHistoryService,
    private readonly analyticsService: ExchangeAnalyticsService,
    private readonly conversionLogRepo: IExchangeConversionLogRepository
  ) {}

  async getOverview(): Promise<ExchangeOverview> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [currentRates, providerHealth, history, analytics, conversionsToday] = await Promise.allSettled([
      Promise.all(TRACKED_PAIRS.map((pair) => this.rateService.getCurrentRate(pair))).then((rates) =>
        rates.filter((r): r is ExchangeRate => r !== null)
      ),
      this.healthService.getSnapshots(),
      this.historyService.getRange(CurrencyPair.UsdPyg, sevenDaysAgo, now),
      this.analyticsService.computeSnapshot(30),
      this.conversionLogRepo.countInRange(startOfToday, now),
    ]);

    const errors: Partial<Record<OverviewKey, string>> = {};

    function resolve<T>(result: PromiseSettledResult<T>, key: OverviewKey): T | null {
      if (result.status === "fulfilled") return result.value;
      errors[key] = String(result.reason);
      return null;
    }

    const resolvedRates = resolve(currentRates, "currentRates");
    const resolvedHealth = resolve(providerHealth, "providerHealth");

    return {
      currentRates: resolvedRates,
      providerHealth: resolvedHealth,
      history: resolve(history, "history"),
      analytics: resolve(analytics, "analytics"),
      conversionsToday: resolve(conversionsToday, "conversionsToday"),
      systemStatus: resolvedHealth ? computeSystemExchangeStatus(resolvedHealth, resolvedRates ?? []) : null,
      errors,
      generatedAt: new Date().toISOString(),
    };
  }
}
