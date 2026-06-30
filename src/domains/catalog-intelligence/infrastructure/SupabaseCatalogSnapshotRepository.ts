import type { SupabaseClient } from "@supabase/supabase-js";
import type { ICatalogSnapshotRepository } from "../repositories/ICatalogSnapshotRepository";
import type { CatalogHealthBreakdown, CatalogHealthSnapshot } from "../types/catalog-intelligence.types";

export class SupabaseCatalogSnapshotRepository implements ICatalogSnapshotRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getHistory(merchantId: string, days: number): Promise<CatalogHealthSnapshot[]> {
    const { data } = await this.client
      .from("merchant_catalog_snapshots")
      .select("snapshot_date, health_score, products_ideal, products_attention, products_critical, total_products")
      .eq("merchant_id", merchantId)
      .order("snapshot_date", { ascending: false })
      .limit(days);

    return (data ?? []).map((row: Record<string, unknown>) => ({
      snapshot_date: row.snapshot_date as string,
      health_score: row.health_score as number,
      products_ideal: row.products_ideal as number,
      products_attention: row.products_attention as number,
      products_critical: row.products_critical as number,
      total_products: row.total_products as number,
    }));
  }

  async saveSnapshot(merchantId: string, healthScore: number, breakdown: CatalogHealthBreakdown): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);

    await this.client
      .from("merchant_catalog_snapshots")
      .upsert(
        {
          merchant_id: merchantId,
          snapshot_date: today,
          health_score: healthScore,
          products_ideal: breakdown.ideal_count,
          products_attention: breakdown.attention_count,
          products_critical: breakdown.critical_count,
          total_products: breakdown.total,
        },
        { onConflict: "merchant_id,snapshot_date" }
      );
  }
}
