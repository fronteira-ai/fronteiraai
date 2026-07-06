import { MarketplaceHealthFactor, MarketplaceHealthStatus } from "../types/enums";
import type { FactorScore, MarketplaceHealthBreakdown } from "../types/health.types";

// ── Marketplace Health Weights (transparent, documented, not a black box) ─────
// overallScore = Σ (factor.score/100 * weight), weights sum to 100.
// Every factor is scored 0-100 on its own scale by the caller (MarketplaceHealthEngine)
// before being weighted here, so each factor is independently readable
// (e.g. "Coverage: 62/100") and not just an opaque contribution.
//
// "Importações" (brief) folds into ConnectorHealth (sync volume/success is
// exactly what a connector health score already measures). "Latência" and
// "Uptime" (brief) fold into ConnectorHealth's own duration/uptime
// sub-metrics rather than being separate top-level factors — this codebase
// has no per-request latency data, only start/complete timestamps on sync
// runs (see ConnectorHealthService), so a standalone "Latência" factor would
// have no real data source. Documented in docs/engineering/TECH_DEBT.md.
const WEIGHTS: Record<MarketplaceHealthFactor, number> = {
  [MarketplaceHealthFactor.ConnectorHealth]: 20,
  [MarketplaceHealthFactor.Freshness]: 15,
  [MarketplaceHealthFactor.Coverage]: 15,
  [MarketplaceHealthFactor.CanonicalCatalog]: 10,
  [MarketplaceHealthFactor.Discovery]: 10,
  [MarketplaceHealthFactor.Claims]: 10,
  [MarketplaceHealthFactor.AnalyticsBrainVolume]: 10,
  [MarketplaceHealthFactor.ConnectorErrors]: 10,
};

export const HEALTH_FACTOR_WEIGHTS: Readonly<Record<MarketplaceHealthFactor, number>> = WEIGHTS;

export interface FactorInput {
  factor: MarketplaceHealthFactor;
  score: number; // 0-100, already computed by the caller for this factor
  detail: string;
}

export function scoreMarketplaceHealth(inputs: FactorInput[]): MarketplaceHealthBreakdown {
  const factors: FactorScore[] = inputs.map((input) => {
    const weight = WEIGHTS[input.factor];
    const clamped = Math.max(0, Math.min(100, Math.round(input.score)));
    return {
      factor: input.factor,
      weight,
      score: clamped,
      weightedScore: Math.round((clamped * weight) / 100),
      detail: input.detail,
    };
  });

  const overallScore = factors.reduce((sum, f) => sum + f.weightedScore, 0);

  const status =
    overallScore >= 80
      ? MarketplaceHealthStatus.Healthy
      : overallScore >= 50
        ? MarketplaceHealthStatus.Attention
        : MarketplaceHealthStatus.Critical;

  return {
    overallScore,
    status,
    factors,
    generatedAt: new Date().toISOString(),
  };
}
