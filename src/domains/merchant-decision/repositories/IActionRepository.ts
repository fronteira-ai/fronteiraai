import type { DecisionAction } from "../types/decision.types";
import type { ActionStatus, RecommendationCategory, RecommendationPriority } from "../types/enums";

export interface CreateActionInput {
  merchant_id: string;
  rule_id: string;
  recommendation_id: string;
  title: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  status?: ActionStatus;
}

export interface UpdateActionInput {
  status: ActionStatus;
  notes?: string;
  acted_at?: string;
  scheduled_for?: string;
}

export interface IActionRepository {
  create(input: CreateActionInput): Promise<DecisionAction | null>;
  findByMerchant(merchantId: string, status?: ActionStatus): Promise<DecisionAction[]>;
  findById(id: string): Promise<DecisionAction | null>;
  findByRuleId(merchantId: string, ruleId: string): Promise<DecisionAction | null>;
  update(id: string, input: UpdateActionInput): Promise<DecisionAction | null>;
  getTimeline(merchantId: string, limit?: number): Promise<DecisionAction[]>;
}
