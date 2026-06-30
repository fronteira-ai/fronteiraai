import type { SupabaseClient } from "@supabase/supabase-js";
import { GrowthContextBuilder } from "@/src/domains/growth-engine/services/GrowthContextBuilder";
import { RecommendationEngine } from "@/src/domains/growth-engine/services/RecommendationEngine";
import { PriorityEngine } from "@/src/domains/growth-engine/services/PriorityEngine";
import { TodaysPlanService } from "@/src/domains/growth-engine/services/TodaysPlanService";
import { OpportunityCenterService } from "@/src/domains/growth-engine/services/OpportunityCenterService";
import { GrowthHistoryService } from "@/src/domains/growth-engine/services/GrowthHistoryService";
import { SupabaseGrowthHistoryRepository } from "@/src/domains/growth-engine/infrastructure/SupabaseGrowthHistoryRepository";
import { bootstrapStrategies } from "@/src/domains/growth-engine/strategies/bootstrap";

export function createGrowthEngineServices(client: SupabaseClient) {
  bootstrapStrategies();

  const historyRepo = new SupabaseGrowthHistoryRepository(client);

  return {
    contextBuilder: new GrowthContextBuilder(client),
    recommendationEngine: new RecommendationEngine(),
    priorityEngine: new PriorityEngine(),
    todaysPlan: new TodaysPlanService(),
    opportunityCenter: new OpportunityCenterService(),
    history: new GrowthHistoryService(historyRepo),
  };
}
