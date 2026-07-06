import type { IMarketplaceSnapshotRepository } from "../repositories/IMarketplaceSnapshotRepository";
import type { MarketplaceHealthBreakdown, MarketplaceHealthSnapshot } from "../types/health.types";
import type { MarketplaceMetricsSnapshot } from "../types/metrics.types";

// Epics 2/6 — persists the daily marketplace-wide health+metrics snapshot.
// Drops the merchant_id dimension from the merchant_catalog_snapshots
// precedent (this is marketplace-wide, one row per day) and upserts on
// snapshot_date the same way, idempotent by the DB unique constraint.
export class MarketplaceSnapshotService {
  constructor(private readonly snapshotRepo: IMarketplaceSnapshotRepository) {}

  async recordDaily(health: MarketplaceHealthBreakdown, metrics: MarketplaceMetricsSnapshot): Promise<void> {
    await this.snapshotRepo.saveSnapshot(health.overallScore, health.factors, metrics as unknown as Record<string, unknown>);
  }

  async getHistory(days: number): Promise<MarketplaceHealthSnapshot[]> {
    return this.snapshotRepo.getHistory(days);
  }

  async getPreviousScore(): Promise<number | null> {
    const latest = await this.snapshotRepo.getLatest();
    return latest?.overallScore ?? null;
  }
}
