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
import {
  MarketplaceMemoryService,
  SupabaseLearnedFactRepository,
  SupabaseMerchantAttributePatternRepository,
} from "@/src/domains/marketplace-memory";
import { createCanonicalCatalogServices } from "@/lib/canonical-catalog-factory";
import { SupabaseCanonicalSuggestionOutboxRepository } from "@/src/domains/connectors/infrastructure/SupabaseCanonicalSuggestionOutboxRepository";
import { MerchantFeedRegistrationService } from "@/src/domains/merchant-feed/registration/MerchantFeedRegistrationService";

/** Registra os IConnector de feeds persistidos (best-effort, assíncrono). */
async function bootstrapMerchantFeeds(service: MerchantFeedRegistrationService, client: SupabaseClient) {
  try {
    const repo = new SupabaseConnectorRepository(client);
    const persisted = await repo.list();
    await service.bootstrap(persisted);
  } catch (e) {
    console.warn("[merchant-feed] bootstrap skipped:", (e as Error).message.slice(0, 80));
  }
}

export function createConnectorsServices(client: SupabaseClient) {
  bootstrapConnectors();

  // Merchant Feed Platform — registra IConnector de feeds persistidos para o
  // Adaptive Sync Engine (cron dispatcher) achar por connector_key.
  // Best-effort: um feed sem registro não bloqueia o dispatch dos demais.
  const merchantFeedService = new MerchantFeedRegistrationService(client);
  void bootstrapMerchantFeeds(merchantFeedService, client);

  const connectorRepo = new SupabaseConnectorRepository(client);  const syncRunRepo = new SupabaseSyncRunRepository(client);
  const catalogRepo = new SupabaseCatalogRepository(client);
  const eventService = new EventService(new SupabaseTrustEventRepository(client));

  const productCandidateRepo = new SupabaseProductCandidateRepository(client);
  const productIdentityMatchLogRepo = new SupabaseProductIdentityMatchLogRepository(client);
  const productIdentityService = new ProductIdentityService(productCandidateRepo, productIdentityMatchLogRepo);

  const changeDetectionService = new ChangeDetectionService(new SupabaseMarketChangeRepository(client));

  // Mission Ω-Gatekeeper (Catalog Integrity Firewall) — reuses Marketplace
  // Memory (Program Ω) so CatalogWriteStage can consult/record learned
  // brand/category corrections, same instance shape already used for
  // Product Identity read-through (lib/canonical-catalog-factory.ts).
  const marketplaceMemoryService = new MarketplaceMemoryService(
    new SupabaseLearnedFactRepository(client),
    new SupabaseMerchantAttributePatternRepository(client)
  );

  // Mission Ω-Canonical Integration — reuses the same Canonical Catalog
  // services canonical-catalog-bootstrap.ts already uses (unmodified),
  // so CanonicalLinkStage calls the exact same public API a human used to
  // invoke manually. `canonicalCatalogRepo` is aliased (not named
  // `catalogRepo`) to avoid colliding with this factory's own connectors-
  // domain `catalogRepo` above — they are two different repositories.
  const { canonicalProductService, catalogRepo: canonicalCatalogRepo } = createCanonicalCatalogServices(client);
  const canonicalSuggestionOutboxRepo = new SupabaseCanonicalSuggestionOutboxRepository(client);

  const syncOrchestrator = new SyncOrchestrator(
    catalogRepo,
    client,
    connectorRepo,
    syncRunRepo,
    eventService,
    productIdentityService,
    changeDetectionService,
    { marketplaceMemoryService, canonicalProductService, canonicalCatalogRepo, canonicalSuggestionOutboxRepo }
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
    marketplaceMemoryService,
    canonicalProductService,
    canonicalCatalogRepo,
    canonicalSuggestionOutboxRepo,
    healthService,
    merchantFeedService,
  };
}
