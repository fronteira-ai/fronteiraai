import type { CatalogHealthBreakdown, CatalogHealthSnapshot } from "../types/catalog-intelligence.types";

export interface ICatalogSnapshotRepository {
  getHistory(merchantId: string, days: number): Promise<CatalogHealthSnapshot[]>;
  saveSnapshot(merchantId: string, healthScore: number, breakdown: CatalogHealthBreakdown): Promise<void>;
}
