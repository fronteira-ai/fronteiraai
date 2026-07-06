import type { MerchantPriorityTier, MerchantBusinessClass } from "./enums";

export interface PriorityFactorBreakdown {
  businessValue: number;
  popularity: number;
  freshness: number;
  coverage: number;
  catalogSize: number;
  syncFrequency: number;
  priceVolatility: number;
}

// Premium and SEO are deliberately absent from this breakdown — no premium
// flag or SEO instrumentation exists yet in this codebase (Programs F/D,
// not shipped). Adding a weighted factor with no real data source would be
// a fabricated proxy; see docs/engineering/TECH_DEBT.md for the named gap.

export interface MerchantPriorityScore {
  storeId: string;
  storeName: string;
  storeSlug: string;
  score: number;
  tier: MerchantPriorityTier;
  businessClass: MerchantBusinessClass;
  breakdown: PriorityFactorBreakdown;
  explanation: string;
}
