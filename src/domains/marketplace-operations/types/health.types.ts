import type { MarketplaceHealthFactor, MarketplaceHealthStatus } from "./enums";

export interface FactorScore {
  factor: MarketplaceHealthFactor;
  weight: number;
  score: number; // 0-100 on the factor's own scale, before weighting
  weightedScore: number; // score * weight / 100, contributes to overallScore
  detail: string;
}

export interface MarketplaceHealthBreakdown {
  overallScore: number;
  status: MarketplaceHealthStatus;
  factors: FactorScore[];
  generatedAt: string;
}

// ── Daily Snapshot (persisted, marketplace-wide — no merchant_id dimension,
// see merchant_catalog_snapshots for the per-merchant precedent this drops) ──

export interface MarketplaceHealthSnapshot {
  snapshotDate: string; // YYYY-MM-DD
  overallScore: number;
  factorBreakdown: FactorScore[];
  metrics: Record<string, unknown>;
}
