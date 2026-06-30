import type { GrowthContext } from "../domain/GrowthContext";
import type { DraftRecommendation, GrowthRecommendation, GrowthPriorityBreakdown } from "../types/growth.types";
import { GrowthCategory, GrowthPriority, GrowthEffort } from "../types/enums";

// ── Transparent scoring weights (documented, auditable) ───────────────────────

const CATEGORY_IMPACT: Record<GrowthCategory, number> = {
  [GrowthCategory.Trust]: 40,
  [GrowthCategory.Conversation]: 36,
  [GrowthCategory.Catalog]: 32,
  [GrowthCategory.Traffic]: 30,
  [GrowthCategory.Visibility]: 28,
  [GrowthCategory.Demand]: 28,
  [GrowthCategory.Pricing]: 26,
  [GrowthCategory.Review]: 22,
  [GrowthCategory.Profile]: 20,
  [GrowthCategory.Freshness]: 18,
};

const PRIORITY_URGENCY: Record<GrowthPriority, number> = {
  [GrowthPriority.Critical]: 30,
  [GrowthPriority.High]: 22,
  [GrowthPriority.Medium]: 14,
  [GrowthPriority.Low]: 5,
};

const EFFORT_EASE: Record<GrowthEffort, number> = {
  [GrowthEffort.Minutes]: 20,
  [GrowthEffort.Hours]: 12,
  [GrowthEffort.Days]: 5,
};

function contextScore(merchantScore: number): number {
  if (merchantScore < 40) return 10;
  if (merchantScore < 70) return 6;
  return 3;
}

function buildReason(rec: DraftRecommendation, breakdown: Omit<GrowthPriorityBreakdown, "reason">): string {
  const parts: string[] = [];

  if (rec.priority === GrowthPriority.Critical) {
    parts.push("ação crítica");
  } else if (rec.priority === GrowthPriority.High) {
    parts.push("alta prioridade");
  }

  if (breakdown.impact_score >= 35) {
    parts.push("alto impacto no crescimento");
  }

  if (breakdown.ease_score >= 18) {
    parts.push("pode ser feita em minutos");
  } else if (breakdown.ease_score >= 10) {
    parts.push("esforço moderado");
  }

  if (breakdown.context_score >= 8) {
    parts.push("especialmente relevante para sua fase atual");
  }

  if (parts.length === 0) {
    return `Score total de ${breakdown.total_score}/100 pela fórmula: impacto + urgência + facilidade + contexto.`;
  }

  return `Aparece em primeiro porque é ${parts.join(", ")}. Score: ${breakdown.total_score}/100.`;
}

export class PriorityEngine {
  score(rec: DraftRecommendation, ctx: GrowthContext): GrowthRecommendation {
    const impact_score = CATEGORY_IMPACT[rec.category];
    const urgency_score = PRIORITY_URGENCY[rec.priority];
    const ease_score = EFFORT_EASE[rec.estimated_effort];
    const context_score_val = contextScore(ctx.summary.merchantScore);
    const total_score = Math.min(impact_score + urgency_score + ease_score + context_score_val, 100);

    const breakdown_partial = { impact_score, urgency_score, ease_score, context_score: context_score_val, total_score };

    return {
      ...rec,
      priority_score: total_score,
      priority_breakdown: {
        ...breakdown_partial,
        reason: buildReason(rec, breakdown_partial),
      },
    };
  }

  scoreAll(drafts: DraftRecommendation[], ctx: GrowthContext): GrowthRecommendation[] {
    return drafts
      .map((d) => this.score(d, ctx))
      .sort((a, b) => b.priority_score - a.priority_score);
  }

  todaysPlan(scored: GrowthRecommendation[], limit = 5): GrowthRecommendation[] {
    return scored.slice(0, limit);
  }
}
