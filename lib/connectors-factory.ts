import type { SupabaseClient } from "@supabase/supabase-js";
import { bootstrapConnectors } from "@/src/domains/connectors/crawler/bootstrap";
import { connectorRegistry } from "@/src/domains/connectors/services/ConnectorRegistry";
import { SyncOrchestrator } from "@/src/domains/connectors/services/SyncOrchestrator";
import { ManualSyncTrigger } from "@/src/domains/connectors/scheduler/ManualSyncTrigger";
import { ConnectorHealthService } from "@/src/domains/connectors/services/ConnectorHealthService";
import { SupabaseConnectorRepository } from "@/src/domains/connectors/infrastructure/SupabaseConnectorRepository";
import { SupabaseSyncRunRepository } from "@/src/domains/connectors/infrastructure/SupabaseSyncRunRepository";
import { SupabaseCatalogRepository } from "@/src/domains/connectors/infrastructure/SupabaseCatalogRepository";
import { EventService } from "@/src/domains/trust/services/EventService";
import { SupabaseTrustEventRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustEventRepository";
import { ProductIdentityService } from "@/src/domains/product-identity/services/ProductIdentityService";
import { SupabaseProductCandidateRepository } from "@/src/domains/product-identity/infrastructure/SupabaseProductCandidateRepository";
import { SupabaseProductIdentityMatchLogRepository } from "@/src/domains/product-identity/infrastructure/SupabaseProductIdentityMatchLogRepository";
import { ChangeDetectionService } from "@/src/domains/realtime-commerce/change-detection/ChangeDetectionService";
import { SupabaseMarketChangeRepository } from "@/src/domains/realtime-commerce/infrastructure/SupabaseMarketChangeRepository";

export function createConnectorsServices(client: SupabaseClient) {
  bootstrapConnectors();

  const connectorRepo = new SupabaseConnectorRepository(client);
  const syncRunRepo = new SupabaseSyncRunRepository(client);
  const catalogRepo = new SupabaseCatalogRepository(client);
  const eventService = new EventService(new SupabaseTrustEventRepository(client));

  const productCandidateRepo = new SupabaseProductCandidateRepository(client);
  const productIdentityMatchLogRepo = new SupabaseProductIdentityMatchLogRepository(client);
  const productIdentityService = new ProductIdentityService(productCandidateRepo, productIdentityMatchLogRepo);

  const changeDetectionService = new ChangeDetectionService(new SupabaseMarketChangeRepository(client));

  const syncOrchestrator = new SyncOrchestrator(
    catalogRepo,
    client,
    connectorRepo,
    syncRunRepo,
    eventService,
    productIdentityService,
    changeDetectionService
  );
  const manualSyncTrigger = new ManualSyncTrigger(syncOrchestrator);
  const healthService = new ConnectorHealthService(connectorRepo, syncRunRepo);

  return {
    connectorRegistry,
    connectorRepo,
    syncRunRepo,
    catalogRepo,
    syncOrchestrator,
    manualSyncTrigger,
    eventService,
    productIdentityService,
    changeDetectionService,
    healthService,
  };
}
