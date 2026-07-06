import type { SupabaseClient } from "@supabase/supabase-js";
import { CoverageDimension } from "../types/enums";
import { getStoreCounts, getStoresByCity } from "../metrics/StoreMetrics";
import { getCatalogCounts, getCategoryCoverage, getBrandCoverage } from "../metrics/CatalogMetrics";
import { findCoverageGaps } from "../scoring/CoverageScoring";
import type { CoverageSnapshot, CoverageGroupCount } from "../types/coverage.types";

// Epic 4 — Marketplace Coverage Engine (trimmed scope). Coverage by
// "segment" and "price band" from the brief is deliberately absent —
// `stores` has no segment column, and inventing a derived taxonomy would
// present guessed data as fact. See docs/engineering/TECH_DEBT.md.
export class MarketplaceCoverageService {
  constructor(private readonly client: SupabaseClient) {}

  async compute(): Promise<CoverageSnapshot> {
    const [storeCounts, catalogCounts, byCategory, byBrand, cityGroups] = await Promise.all([
      getStoreCounts(this.client),
      getCatalogCounts(this.client),
      getCategoryCoverage(this.client),
      getBrandCoverage(this.client),
      getStoresByCity(this.client),
    ]);

    const byCity: CoverageGroupCount[] = cityGroups.map((c) => ({
      id: c.city,
      name: c.city,
      productCount: c.storeCount,
    }));

    const gaps = [
      ...findCoverageGaps(CoverageDimension.Category, byCategory),
      ...findCoverageGaps(CoverageDimension.Brand, byBrand),
    ];

    return {
      totalStores: storeCounts.total,
      discoveredStores: storeCounts.discovered,
      syncedStores: storeCounts.synced,
      claimedStores: storeCounts.claimed,
      byCategory,
      byBrand,
      byCity,
      canonicalBootstrapPct: catalogCounts.canonicalBootstrapPct,
      gaps,
      generatedAt: new Date().toISOString(),
    };
  }
}
