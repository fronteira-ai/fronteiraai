import type { Recommendation, PriorityScore } from "../types/decision.types";
import { RecommendationPriority, EstimatedEffort } from "../types/enums";

// ── Priority Weights (transparent, not a black box) ───────────────────────────
// Score = impact_score + effort_score + urgency_score + category_weight
// Maximum: 100 points
// Rule: higher score = higher in list

const PRIORITY_SCORES: Record<RecommendationPriority, number> = {
  [RecommendationPriority.Critical]: 40,
  [RecommendationPriority.High]:     30,
  [RecommendationPriority.Medium]:   20,
  [RecommendationPriority.Low]:      10,
};

const EFFORT_SCORES: Record<EstimatedEffort, number> = {
  [EstimatedEffort.Minutes]: 30,
  [EstimatedEffort.Hours]:   20,
  [EstimatedEffort.Days]:    10,
};

// Catalog and Profile issues are immediately actionable → extra weight
const CATEGORY_WEIGHTS: Record<string, number> = {
  catalog:     15,
  profile:     15,
  trust:       10,
  analytics:    5,
  opportunity:  5,
  operational:  5,
};

export class PrioritizationEngine {
  score(recommendation: Recommendation): PriorityScore {
    const impact_score    = PRIORITY_SCORES[recommendation.priority] ?? 10;
    const effort_score    = EFFORT_SCORES[recommendation.estimated_effort] ?? 10;
    const urgency_score   = this.computeUrgency(recommendation);
    const category_weight = CATEGORY_WEIGHTS[recommendation.category] ?? 5;

    const score = impact_score + effort_score + urgency_score + category_weight;

    return {
      recommendation_id: recommendation.id,
      score,
      score_breakdown: {
        impact_score,
        effort_score,
        urgency_score,
        category_weight,
      },
      explanation: this.explain(impact_score, effort_score, urgency_score, category_weight),
    };
  }

  sort(recommendations: Recommendation[]): Recommendation[] {
    return [...recommendations].sort((a, b) => {
      const scoreA = this.score(a).score;
      const scoreB = this.score(b).score;
      return scoreB - scoreA;
    });
  }

  todaysPriorities(recommendations: Recommendation[], limit = 5): Recommendation[] {
    return this.sort(recommendations).slice(0, limit);
  }

  private computeUrgency(rec: Recommendation): number {
    // Quick wins (minutes + high priority) get urgency boost
    if (
      rec.estimated_effort === EstimatedEffort.Minutes &&
      (rec.priority === RecommendationPriority.Critical || rec.priority === RecommendationPriority.High)
    ) {
      return 15;
    }
    // Critical regardless of effort
    if (rec.priority === RecommendationPriority.Critical) return 10;
    return 0;
  }

  private explain(impact: number, effort: number, urgency: number, category: number): string {
    const parts: string[] = [];
    if (impact >= 30) parts.push("impacto alto");
    else if (impact >= 20) parts.push("impacto médio");
    else parts.push("impacto baixo");

    if (effort >= 25) parts.push("execução rápida");
    else if (effort >= 15) parts.push("esforço moderado");
    else parts.push("esforço elevado");

    if (urgency > 0) parts.push("ação urgente");
    if (category >= 10) parts.push("categoria prioritária");

    return parts.join(", ").replace(/^./, (c) => c.toUpperCase());
  }
}
