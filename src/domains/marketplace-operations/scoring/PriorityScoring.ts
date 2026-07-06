import { MerchantPriorityTier, MerchantBusinessClass } from "../types/enums";
import type { PriorityFactorBreakdown, MerchantPriorityScore } from "../types/priority.types";

// ── Merchant Priority Weights (transparent, documented, not a black box) ──────
// score = Σ weighted factors, max 100. Same additive/explainable shape as
// merchant-decision's PrioritizationEngine (impact+effort+urgency+category).
//
// Premium and SEO factors from the brief are deliberately excluded (no
// weight assigned) — no premium flag or SEO instrumentation exists yet in
// this codebase (those ship in later Programs F/D). Fabricating a proxy
// metric would violate this project's no-invented-precision discipline;
// see docs/engineering/TECH_DEBT.md for the named gap.
const WEIGHTS = {
  businessValue: 25,
  popularity: 20,
  freshness: 15,
  coverage: 15,
  catalogSize: 10,
  syncFrequency: 10,
  priceVolatility: 5,
} as const;

export const PRIORITY_FACTOR_WEIGHTS: Readonly<typeof WEIGHTS> = WEIGHTS;

export interface PriorityFactorInputs {
  /** 0-1: e.g. verified+claimed=1, verified only=0.6, neither=0.2 */
  businessValue: number;
  /** 0-1: buyer_events volume for this store, normalized against the marketplace max */
  popularity: number;
  /** 0-1: recency of the store's last successful sync */
  freshness: number;
  /** 0-1: offer/product count for this store, normalized against the marketplace norm */
  coverage: number;
  /** 0-1: product count, normalized against the marketplace norm */
  catalogSize: number;
  /** 0-1: sync recency/frequency relative to the connector's configured interval */
  syncFrequency: number;
  /** 0-1: normalized price variance from price_history — more movement needs more attention */
  priceVolatility: number;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function scoreMerchantPriority(
  storeId: string,
  storeName: string,
  storeSlug: string,
  inputs: PriorityFactorInputs
): MerchantPriorityScore {
  const breakdown: PriorityFactorBreakdown = {
    businessValue: Math.round(clamp01(inputs.businessValue) * WEIGHTS.businessValue),
    popularity: Math.round(clamp01(inputs.popularity) * WEIGHTS.popularity),
    freshness: Math.round(clamp01(inputs.freshness) * WEIGHTS.freshness),
    coverage: Math.round(clamp01(inputs.coverage) * WEIGHTS.coverage),
    catalogSize: Math.round(clamp01(inputs.catalogSize) * WEIGHTS.catalogSize),
    syncFrequency: Math.round(clamp01(inputs.syncFrequency) * WEIGHTS.syncFrequency),
    priceVolatility: Math.round(clamp01(inputs.priceVolatility) * WEIGHTS.priceVolatility),
  };

  const score = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  const tier =
    score >= 80
      ? MerchantPriorityTier.Diamond
      : score >= 60
        ? MerchantPriorityTier.Gold
        : score >= 35
          ? MerchantPriorityTier.Silver
          : MerchantPriorityTier.Bronze;

  const businessClass =
    score >= 70
      ? MerchantBusinessClass.StrategicPartner
      : score >= 45
        ? MerchantBusinessClass.GrowthAccount
        : score >= 20
          ? MerchantBusinessClass.StandardAccount
          : MerchantBusinessClass.DormantAccount;

  return {
    storeId,
    storeName,
    storeSlug,
    score,
    tier,
    businessClass,
    breakdown,
    explanation: explain(breakdown),
  };
}

function explain(b: PriorityFactorBreakdown): string {
  const parts: string[] = [];
  if (b.businessValue >= WEIGHTS.businessValue * 0.8) parts.push("alto valor de negócio (verificada/reivindicada)");
  if (b.popularity >= WEIGHTS.popularity * 0.75) parts.push("alta popularidade entre compradores");
  if (b.freshness < WEIGHTS.freshness * 0.5) parts.push("sincronização desatualizada");
  if (b.coverage >= WEIGHTS.coverage * 0.75) parts.push("boa cobertura de catálogo");
  if (b.catalogSize >= WEIGHTS.catalogSize * 0.75) parts.push("catálogo extenso");
  if (b.priceVolatility >= WEIGHTS.priceVolatility * 0.75) parts.push("preços voláteis, requer atenção");

  if (parts.length === 0) return "Sem destaques — conta padrão";
  return parts.join(", ").replace(/^./, (c) => c.toUpperCase());
}
