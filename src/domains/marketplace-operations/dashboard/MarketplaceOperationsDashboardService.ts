import type { ConnectorHealthService, ConnectorHealthSummary } from "@/src/domains/connectors/services/ConnectorHealthService";
import type { MarketplaceHealthEngine } from "../health/MarketplaceHealthEngine";
import type { MerchantPriorityService } from "../services/MerchantPriorityService";
import type { MarketplaceCoverageService } from "../services/MarketplaceCoverageService";
import type { MarketplaceMetricsService } from "../metrics/MarketplaceMetricsService";
import type { MarketplaceAlertService } from "../services/MarketplaceAlertService";
import { MarketplaceAlertStatus } from "../types/enums";
import type { MarketplaceHealthBreakdown } from "../types/health.types";
import type { MerchantPriorityScore } from "../types/priority.types";
import type { CoverageSnapshot } from "../types/coverage.types";
import type { MarketplaceMetricsSnapshot } from "../types/metrics.types";
import type { MarketplaceAlert } from "../types/alerts.types";

type OverviewKey = "health" | "priority" | "coverage" | "connectors" | "metrics" | "alerts";

export interface MarketplaceOperationsOverview {
  health: MarketplaceHealthBreakdown | null;
  priority: MerchantPriorityScore[] | null;
  coverage: CoverageSnapshot | null;
  connectors: ConnectorHealthSummary[] | null;
  metrics: MarketplaceMetricsSnapshot | null;
  alerts: MarketplaceAlert[] | null;
  errors: Partial<Record<OverviewKey, string>>;
  generatedAt: string;
}

// Epic 7 — Marketplace Operations Dashboard (composition layer). Same
// Promise.allSettled + index-mapped-fallback isolation as
// app/api/admin/platform-health/route.ts — one failing sub-service (e.g. a
// slow priority scan over many stores) never breaks the whole payload.
export class MarketplaceOperationsDashboardService {
  constructor(
    private readonly healthEngine: MarketplaceHealthEngine,
    private readonly priorityService: MerchantPriorityService,
    private readonly coverageService: MarketplaceCoverageService,
    private readonly connectorHealthService: ConnectorHealthService,
    private readonly metricsService: MarketplaceMetricsService,
    private readonly alertService: MarketplaceAlertService
  ) {}

  async overview(): Promise<MarketplaceOperationsOverview> {
    const [health, priority, coverage, connectors, metrics, alerts] = await Promise.allSettled([
      this.healthEngine.compute(),
      this.priorityService.listAll(),
      this.coverageService.compute(),
      this.connectorHealthService.getSummaries(),
      this.metricsService.snapshot(),
      this.alertService.list(MarketplaceAlertStatus.Pending),
    ]);

    const errors: Partial<Record<OverviewKey, string>> = {};

    function resolve<T>(result: PromiseSettledResult<T>, key: OverviewKey): T | null {
      if (result.status === "fulfilled") return result.value;
      errors[key] = String(result.reason);
      return null;
    }

    return {
      health: resolve(health, "health"),
      priority: resolve(priority, "priority"),
      coverage: resolve(coverage, "coverage"),
      connectors: resolve(connectors, "connectors"),
      metrics: resolve(metrics, "metrics"),
      alerts: resolve(alerts, "alerts"),
      errors,
      generatedAt: new Date().toISOString(),
    };
  }
}
