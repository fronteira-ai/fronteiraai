import type { MarketPulseSnapshot } from "../types";

export interface IMarketPulseSnapshotRepository {
  /** Upsert-by-date, same pattern as marketplace_health_snapshots — one row
   * per day, overwritten as the day progresses until the cron's final run. */
  save(snapshot: MarketPulseSnapshot): Promise<void>;
  getLatest(): Promise<MarketPulseSnapshot | null>;
  getHistory(days: number): Promise<MarketPulseSnapshot[]>;
}
