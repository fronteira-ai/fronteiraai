import type { MarketplaceHealthSnapshot, FactorScore } from "../types/health.types";

export interface IMarketplaceSnapshotRepository {
  getHistory(days: number): Promise<MarketplaceHealthSnapshot[]>;
  getLatest(): Promise<MarketplaceHealthSnapshot | null>;
  saveSnapshot(overallScore: number, factorBreakdown: FactorScore[], metrics: Record<string, unknown>): Promise<void>;
}
