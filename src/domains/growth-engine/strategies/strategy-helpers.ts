import type { GrowthStrategyType } from "../types/enums";
import { GrowthStatus, PlanTier } from "../types/enums";
import type { DraftRecommendation, GrowthEvidence } from "../types/growth.types";

export function makeId(strategyId: GrowthStrategyType, subcategory: string, merchantId: string): string {
  return `${strategyId}:${subcategory}:${merchantId}`;
}

export function now(): string {
  return new Date().toISOString();
}

export type PartialDraft = Omit<DraftRecommendation, "id" | "status" | "created_at" | "plan_tier">;

export function draft(
  strategyId: GrowthStrategyType,
  merchantId: string,
  partial: PartialDraft,
  planTier: PlanTier = PlanTier.Free
): DraftRecommendation {
  return {
    ...partial,
    id: makeId(strategyId, partial.subcategory, merchantId),
    status: GrowthStatus.New,
    created_at: now(),
    plan_tier: planTier,
  };
}

export function evidence(label: string, value: number | string, unit?: string): GrowthEvidence {
  return { label, value, ...(unit ? { unit } : {}) };
}
