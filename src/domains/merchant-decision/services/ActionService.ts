import type { IActionRepository, UpdateActionInput } from "../repositories/IActionRepository";
import type { DecisionAction, Recommendation } from "../types/decision.types";
import { ActionStatus } from "../types/enums";

// ── Action Service ────────────────────────────────────────────────────────────
// Manages the lifecycle of merchant actions on recommendations.

export class ActionService {
  constructor(private readonly actionRepo: IActionRepository) {}

  async recordFromRecommendation(
    merchantId: string,
    recommendation: Recommendation
  ): Promise<DecisionAction | null> {
    // Don't create duplicates for pending/postponed actions of the same rule
    const existing = await this.actionRepo.findByRuleId(merchantId, recommendation.rule_id);
    if (existing) return existing;

    return this.actionRepo.create({
      merchant_id: merchantId,
      rule_id: recommendation.rule_id,
      recommendation_id: recommendation.id,
      title: recommendation.title,
      category: recommendation.category,
      priority: recommendation.priority,
      status: ActionStatus.Pending,
    });
  }

  async getActions(merchantId: string, status?: ActionStatus): Promise<DecisionAction[]> {
    return this.actionRepo.findByMerchant(merchantId, status);
  }

  async getById(id: string): Promise<DecisionAction | null> {
    return this.actionRepo.findById(id);
  }

  async updateAction(id: string, merchantId: string, input: UpdateActionInput): Promise<DecisionAction | null> {
    const action = await this.actionRepo.findById(id);
    if (!action || action.merchant_id !== merchantId) return null;
    return this.actionRepo.update(id, input);
  }

  async getTimeline(merchantId: string, limit = 30): Promise<DecisionAction[]> {
    return this.actionRepo.getTimeline(merchantId, limit);
  }
}
