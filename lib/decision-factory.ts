import type { SupabaseClient } from "@supabase/supabase-js";
import { DecisionContextBuilder } from "@/src/domains/merchant-decision/services/DecisionContextBuilder";
import { RecommendationEngine } from "@/src/domains/merchant-decision/services/RecommendationEngine";
import { PrioritizationEngine } from "@/src/domains/merchant-decision/services/PrioritizationEngine";
import { OpportunityDetector } from "@/src/domains/merchant-decision/services/OpportunityDetector";
import { ActionService } from "@/src/domains/merchant-decision/services/ActionService";
import { SupabaseActionRepository } from "@/src/domains/merchant-decision/infrastructure/SupabaseActionRepository";

export function createDecisionServices(client: SupabaseClient) {
  const actionRepo = new SupabaseActionRepository(client);

  return {
    contextBuilder: new DecisionContextBuilder(client),
    recommendationEngine: new RecommendationEngine(),
    prioritization: new PrioritizationEngine(),
    opportunityDetector: new OpportunityDetector(),
    actionService: new ActionService(actionRepo),
  };
}
