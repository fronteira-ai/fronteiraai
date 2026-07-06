import type { SupabaseClient } from "@supabase/supabase-js";
import type { IMarketPulseSnapshotRepository } from "../repositories/IMarketPulseSnapshotRepository";
import type { CategoryMovement, MarketPulseSnapshot, StoreMovement } from "../types";

interface SnapshotRow {
  snapshot_date: string;
  prices_changed_count: number;
  prices_dropped_count: number;
  prices_raised_count: number;
  products_added_count: number;
  products_removed_count: number;
  top_categories: CategoryMovement[];
  top_stores: StoreMovement[];
  cheapest_category: CategoryMovement | null;
  most_expensive_move_category: CategoryMovement | null;
  generated_at: string;
}

function toDomain(row: SnapshotRow): MarketPulseSnapshot {
  return {
    snapshotDate: row.snapshot_date,
    pricesChangedCount: row.prices_changed_count,
    pricesDroppedCount: row.prices_dropped_count,
    pricesRaisedCount: row.prices_raised_count,
    productsAddedCount: row.products_added_count,
    productsRemovedCount: row.products_removed_count,
    topCategories: row.top_categories ?? [],
    topStores: row.top_stores ?? [],
    cheapestCategory: row.cheapest_category,
    mostExpensiveMoveCategory: row.most_expensive_move_category,
    generatedAt: row.generated_at,
  };
}

const COLUMNS =
  "snapshot_date, prices_changed_count, prices_dropped_count, prices_raised_count, products_added_count, products_removed_count, top_categories, top_stores, cheapest_category, most_expensive_move_category, generated_at";

export class SupabaseMarketPulseSnapshotRepository implements IMarketPulseSnapshotRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(snapshot: MarketPulseSnapshot): Promise<void> {
    await this.client.from("market_pulse_snapshots").upsert(
      {
        snapshot_date: snapshot.snapshotDate,
        prices_changed_count: snapshot.pricesChangedCount,
        prices_dropped_count: snapshot.pricesDroppedCount,
        prices_raised_count: snapshot.pricesRaisedCount,
        products_added_count: snapshot.productsAddedCount,
        products_removed_count: snapshot.productsRemovedCount,
        top_categories: snapshot.topCategories,
        top_stores: snapshot.topStores,
        cheapest_category: snapshot.cheapestCategory,
        most_expensive_move_category: snapshot.mostExpensiveMoveCategory,
      },
      { onConflict: "snapshot_date" }
    );
  }

  async getLatest(): Promise<MarketPulseSnapshot | null> {
    const { data } = await this.client
      .from("market_pulse_snapshots")
      .select(COLUMNS)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? toDomain(data as SnapshotRow) : null;
  }

  async getHistory(days: number): Promise<MarketPulseSnapshot[]> {
    const { data } = await this.client
      .from("market_pulse_snapshots")
      .select(COLUMNS)
      .order("snapshot_date", { ascending: false })
      .limit(days);

    return ((data ?? []) as SnapshotRow[]).map(toDomain);
  }
}
