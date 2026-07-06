import type { SupabaseClient } from "@supabase/supabase-js";
import type { IMarketplaceSnapshotRepository } from "../repositories/IMarketplaceSnapshotRepository";
import type { MarketplaceHealthSnapshot, FactorScore } from "../types/health.types";

interface SnapshotRow {
  snapshot_date: string;
  overall_score: number;
  factor_breakdown: FactorScore[];
  metrics: Record<string, unknown>;
}

function toDomain(row: SnapshotRow): MarketplaceHealthSnapshot {
  return {
    snapshotDate: row.snapshot_date,
    overallScore: row.overall_score,
    factorBreakdown: row.factor_breakdown,
    metrics: row.metrics,
  };
}

// Mirrors SupabaseCatalogSnapshotRepository's upsert-by-date pattern, but
// marketplace-wide — snapshot_date alone is the unique key (no merchant_id).
export class SupabaseMarketplaceSnapshotRepository implements IMarketplaceSnapshotRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getHistory(days: number): Promise<MarketplaceHealthSnapshot[]> {
    const { data } = await this.client
      .from("marketplace_health_snapshots")
      .select("snapshot_date, overall_score, factor_breakdown, metrics")
      .order("snapshot_date", { ascending: false })
      .limit(days);

    return ((data ?? []) as SnapshotRow[]).map(toDomain);
  }

  async getLatest(): Promise<MarketplaceHealthSnapshot | null> {
    const { data } = await this.client
      .from("marketplace_health_snapshots")
      .select("snapshot_date, overall_score, factor_breakdown, metrics")
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? toDomain(data as SnapshotRow) : null;
  }

  async saveSnapshot(overallScore: number, factorBreakdown: FactorScore[], metrics: Record<string, unknown>): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);

    await this.client.from("marketplace_health_snapshots").upsert(
      {
        snapshot_date: today,
        overall_score: overallScore,
        factor_breakdown: factorBreakdown,
        metrics,
      },
      { onConflict: "snapshot_date" }
    );
  }
}
