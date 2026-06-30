import type { DecisionContext, Recommendation } from "../types/decision.types";
import type { RecommendationCategory, RecommendationPriority } from "../types/enums";

// ── Rule Result ───────────────────────────────────────────────────────────────

export type RuleResult = Omit<Recommendation, "id" | "status" | "created_at">;

// ── Rule Interface ────────────────────────────────────────────────────────────
// Each rule is a pure function: given context, either fires (returns result) or passes (returns null).
// Rules MUST be deterministic and have zero side effects.
// Evidence MUST be derived exclusively from the DecisionContext — never invented.

export interface Rule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: RecommendationCategory;
  readonly defaultPriority: RecommendationPriority;
  evaluate(context: DecisionContext): RuleResult | null;
}
