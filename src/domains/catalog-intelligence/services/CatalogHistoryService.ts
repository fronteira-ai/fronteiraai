import type { ICatalogSnapshotRepository } from "../repositories/ICatalogSnapshotRepository";
import type { CatalogHealthBreakdown, CatalogHealthHistory } from "../types/catalog-intelligence.types";
import type { CatalogTrend } from "../types/enums";

function computeTrend(snapshots: { health_score: number }[]): CatalogTrend {
  if (snapshots.length < 2) return "stable";
  const newest = snapshots[0].health_score;
  const oldest = snapshots[snapshots.length - 1].health_score;
  const delta = newest - oldest;
  if (delta >= 5) return "improving";
  if (delta <= -5) return "declining";
  return "stable";
}

export class CatalogHistoryService {
  constructor(private readonly repo: ICatalogSnapshotRepository) {}

  async getHistory(merchantId: string, days = 30): Promise<CatalogHealthHistory> {
    const snapshots = await this.repo.getHistory(merchantId, days);
    return {
      merchant_id: merchantId,
      snapshots,
      trend: computeTrend(snapshots),
      generated_at: new Date().toISOString(),
    };
  }

  async recordSnapshot(merchantId: string, breakdown: CatalogHealthBreakdown): Promise<void> {
    await this.repo.saveSnapshot(merchantId, breakdown.health_score, breakdown);
  }
}
