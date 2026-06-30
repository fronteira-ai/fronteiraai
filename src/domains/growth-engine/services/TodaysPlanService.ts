import type { GrowthRecommendation, TodaysPlan } from "../types/growth.types";
import { PlanTier } from "../types/enums";

export class TodaysPlanService {
  buildPlan(scored: GrowthRecommendation[], merchantId: string, maxItems = 5): TodaysPlan {
    const freeTier = scored.filter((r) => r.plan_tier === PlanTier.Free);
    const plan_items = freeTier.slice(0, maxItems);
    const premiumCount = scored.filter((r) => r.plan_tier !== PlanTier.Free).length;

    return {
      merchant_id: merchantId,
      date: new Date().toISOString().slice(0, 10),
      plan_items,
      total_available: scored.length,
      estimated_total_minutes: plan_items.reduce((acc, r) => acc + r.estimated_minutes, 0),
      premium_items_available: premiumCount,
      generated_at: new Date().toISOString(),
    };
  }
}
