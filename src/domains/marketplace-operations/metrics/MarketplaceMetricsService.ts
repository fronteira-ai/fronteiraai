import type { SupabaseClient } from "@supabase/supabase-js";
import { getStoreCounts } from "./StoreMetrics";
import { getCatalogCounts, getCategoryCoverage } from "./CatalogMetrics";
import { getSyncRateMetrics } from "./SyncMetrics";
import { getBuyerVolumeMetrics } from "./BuyerMetrics";
import { getBrainVolumeMetrics } from "./BrainMetrics";
import type { MarketplaceMetricsSnapshot } from "../types/metrics.types";

// Epic 6 — Marketplace Metrics. Composes the read-only metrics/ modules into
// the official snapshot. Pure aggregation, no scoring — scoring/ consumes
// this output, it doesn't live here.
export class MarketplaceMetricsService {
  constructor(private readonly client: SupabaseClient) {}

  async snapshot(): Promise<MarketplaceMetricsSnapshot> {
    const [storeCounts, catalogCounts, categoryCoverage, syncRates, buyerVolume, brainVolume] = await Promise.all([
      getStoreCounts(this.client),
      getCatalogCounts(this.client),
      getCategoryCoverage(this.client),
      getSyncRateMetrics(this.client),
      getBuyerVolumeMetrics(this.client),
      getBrainVolumeMetrics(this.client),
    ]);

    const coveredCategories = categoryCoverage.filter((c) => c.productCount > 0).length;
    const coveragePct =
      categoryCoverage.length > 0 ? Math.round((coveredCategories / categoryCoverage.length) * 100) : 0;

    const claimRate = storeCounts.total > 0 ? Math.round((storeCounts.claimed / storeCounts.total) * 100) : 0;

    return {
      stores: storeCounts.total,
      products: catalogCounts.products,
      offers: catalogCounts.offers,
      canonicalProducts: catalogCounts.canonicalProducts,
      brands: catalogCounts.brands,
      categories: catalogCounts.categories,
      coveragePct,
      syncsPerHour: syncRates.syncsPerHour,
      priceUpdatesPerHour: syncRates.priceUpdatesPerHour,
      claimRate,
      buyerSessions: buyerVolume.buyerSessions,
      buyerEvents: buyerVolume.buyerEvents,
      brainEvents: brainVolume.brainEvents,
      knowledgeRelations: brainVolume.knowledgeRelations,
      generatedAt: new Date().toISOString(),
    };
  }
}
