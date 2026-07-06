import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConnectorObservabilitySnapshot } from "@/src/domains/connectors/observability/types";
import { createConnectorsServices } from "./connectors-factory";
import { createRealtimeCommerceServices } from "./realtime-commerce-factory";
import { fetchStoreOfferCatalog } from "./connector-store-catalog-query";
import { ConnectorCertificationService } from "./connector-certification-service";

/** Bounded sample of distinct product IDs averaged for the store-level
 * Volatility figure — computing VolatilityEngine per product is real work
 * (queries `market_changes` per product); a whole catalog would not scale,
 * a small sample is representative enough for an observability snapshot. */
const VOLATILITY_SAMPLE_SIZE = 20;

/** Window for "products/offers changed" — Wave 6 (Program B — Wave 2).
 * Fixed at 24h rather than "since last successful sync" for simplicity and
 * consistency across connectors with very different sync cadences; the
 * number is a health signal, not an audit trail (that's `market_changes`
 * itself, queryable with any window). */
const CHANGE_WINDOW_HOURS = 24;
const CHANGE_SAMPLE_LIMIT = 3000;

// Connector Observability (Release 1.8 — Program A — Wave 5; expanded Wave 6
// — Program B — Wave 2). Merges ConnectorHealthService (connectors) with
// StoreUpdateIntelligenceService/VolatilityService/market_changes
// (realtime-commerce) and ConnectorCertificationService's quality score into
// one queryable per-connector shape — no new engine, no new table, purely a
// read composition. Lives in lib/ for the same circular-dependency reason as
// ConnectorCertificationService (see that file's header comment).
export class ConnectorObservabilityService {
  constructor(private readonly client: SupabaseClient) {}

  async getSnapshot(connectorId: string, storeSlug: string): Promise<ConnectorObservabilitySnapshot | null> {
    const { catalogRepo, healthService, connectorRepo, syncRunRepo } = createConnectorsServices(this.client);
    const storeId = await catalogRepo.findStoreIdBySlug(storeSlug);
    if (!storeId) return null;

    const { storeUpdateService, volatilityService, changeRepo } = createRealtimeCommerceServices(this.client);
    const certificationService = new ConnectorCertificationService(this.client);

    const [connector, healthSummaries, offers, storeUpdateProfile, qualityScore] = await Promise.all([
      connectorRepo.findByKey(connectorId),
      healthService.getSummaries(),
      fetchStoreOfferCatalog(this.client, storeId),
      storeUpdateService.computeForStore(storeId, storeSlug),
      certificationService.computeQualityScore(connectorId, storeSlug),
    ]);

    const health = healthSummaries.find((h) => h.connectorKey === connectorId);

    const lastRun = connector ? (await syncRunRepo.findByConnector(connector.id, 1))[0] : undefined;
    const lastTotals = lastRun?.totals as Record<string, number> | undefined;

    const to = new Date();
    const from = new Date(to.getTime() - CHANGE_WINDOW_HOURS * 60 * 60 * 1000);
    const recentChanges = await changeRepo.listForStore(storeId, from, to, CHANGE_SAMPLE_LIMIT);
    const productsChanged = new Set(recentChanges.filter((c) => c.entityType === "product").map((c) => c.entityId)).size;
    const offersChanged = new Set(recentChanges.filter((c) => c.entityType === "offer").map((c) => c.entityId)).size;

    const categories = new Set(offers.map((o) => o.products.category_id).filter(Boolean)).size;
    const brands = new Set(offers.map((o) => o.products.brand_id).filter(Boolean)).size;
    const withImage = offers.filter((o) => o.products.image_url).length;
    const imagesCoveragePct = offers.length > 0 ? Math.round((withImage / offers.length) * 100) : 0;

    const productIds = [...new Set(offers.map((o) => o.products.id))].slice(0, VOLATILITY_SAMPLE_SIZE);
    const volatilityScores = await Promise.all(productIds.map((id) => volatilityService.computeForProduct(id)));
    const scoredVolatility = volatilityScores.filter((v) => v.sampleSize >= 2);
    const volatilityScore =
      scoredVolatility.length > 0
        ? Math.round(scoredVolatility.reduce((sum, v) => sum + v.score, 0) / scoredVolatility.length)
        : null;

    return {
      connectorId,
      storeId,
      storeSlug,
      status: connector?.status ?? null,
      lastSyncAt: health?.lastSyncAt ?? null,
      lastStatus: health?.lastStatus ?? null,
      productsProcessedLastSync: lastTotals?.received ?? null,
      productsChanged,
      offersChanged,
      failuresLastSync: lastTotals?.failed ?? null,
      productsImported: null,
      offersImported: offers.length,
      categories,
      brands,
      imagesCoveragePct,
      latencySeconds: health?.avgDurationSeconds ?? null,
      errorRate: health?.errorRate ?? 0,
      retryCount: null,
      freshnessScore: storeUpdateProfile.avgFreshnessScore,
      volatilityScore,
      healthScore: health?.healthScore ?? 0,
      qualityScore: qualityScore?.score ?? null,
      generatedAt: new Date().toISOString(),
    };
  }
}
