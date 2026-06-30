import { RuleRegistry } from "../rules/RuleRegistry";
import { bootstrapRules } from "../rules/bootstrap";
import type { DecisionContext, Recommendation } from "../types/decision.types";
import { RecommendationStatus } from "../types/enums";

// ── Recommendation Engine ─────────────────────────────────────────────────────
// Runs all registered rules against a DecisionContext.
// Each rule is evaluated independently — failures in one rule never block others.
// Results are enriched with id, status, and created_at before returning.

export class RecommendationEngine {
  constructor() {
    bootstrapRules();
  }

  generate(context: DecisionContext): Recommendation[] {
    const rules = RuleRegistry.getAll();
    const recommendations: Recommendation[] = [];

    for (const rule of rules) {
      try {
        const result = rule.evaluate(context);
        if (!result) continue;

        recommendations.push({
          ...result,
          id: `${rule.id}:${context.merchant.id}`,
          status: RecommendationStatus.Active,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`[RecommendationEngine] Rule ${rule.id} failed:`, err);
      }
    }

    return recommendations;
  }
}
