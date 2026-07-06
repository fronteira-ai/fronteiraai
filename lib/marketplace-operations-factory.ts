import type { SupabaseClient } from "@supabase/supabase-js";
import { createConnectorsServices } from "@/lib/connectors-factory";
import { MarketplaceHealthEngine } from "@/src/domains/marketplace-operations/health/MarketplaceHealthEngine";
import { MerchantPriorityService } from "@/src/domains/marketplace-operations/services/MerchantPriorityService";
import { MarketplaceCoverageService } from "@/src/domains/marketplace-operations/services/MarketplaceCoverageService";
import { MarketplaceMetricsService } from "@/src/domains/marketplace-operations/metrics/MarketplaceMetricsService";
import { MarketplaceAlertService } from "@/src/domains/marketplace-operations/services/MarketplaceAlertService";
import { MarketplaceSnapshotService } from "@/src/domains/marketplace-operations/services/MarketplaceSnapshotService";
import { MarketplaceOperationsDashboardService } from "@/src/domains/marketplace-operations/dashboard/MarketplaceOperationsDashboardService";
import { SupabaseMarketplaceSnapshotRepository } from "@/src/domains/marketplace-operations/infrastructure/SupabaseMarketplaceSnapshotRepository";
import { SupabaseMarketplaceAlertRepository } from "@/src/domains/marketplace-operations/infrastructure/SupabaseMarketplaceAlertRepository";

export function createMarketplaceOperationsServices(client: SupabaseClient) {
  const { healthService: connectorHealthService } = createConnectorsServices(client);

  const snapshotRepo = new SupabaseMarketplaceSnapshotRepository(client);
  const alertRepo = new SupabaseMarketplaceAlertRepository(client);

  const healthEngine = new MarketplaceHealthEngine(client, connectorHealthService);
  const priorityService = new MerchantPriorityService(client);
  const coverageService = new MarketplaceCoverageService(client);
  const metricsService = new MarketplaceMetricsService(client);
  const alertService = new MarketplaceAlertService(alertRepo);
  const snapshotService = new MarketplaceSnapshotService(snapshotRepo);

  const dashboardService = new MarketplaceOperationsDashboardService(
    healthEngine,
    priorityService,
    coverageService,
    connectorHealthService,
    metricsService,
    alertService
  );

  return {
    connectorHealthService,
    healthEngine,
    priorityService,
    coverageService,
    metricsService,
    alertService,
    snapshotService,
    dashboardService,
  };
}
