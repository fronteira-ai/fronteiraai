// ── Domain: merchant-decision ────────────────────────────────────────────────
// Merchant Decision Engine: rules-based, transparent, fully explainable.
// Every recommendation has evidence. No black boxes.

export * from "./types";
export type { Rule } from "./rules/Rule";
export type { RuleResult } from "./rules/Rule";
export { RuleRegistry } from "./rules/RuleRegistry";
export { bootstrapRules } from "./rules/bootstrap";
export { RecommendationEngine } from "./services/RecommendationEngine";
export { PrioritizationEngine } from "./services/PrioritizationEngine";
export { OpportunityDetector } from "./services/OpportunityDetector";
export { ActionService } from "./services/ActionService";
export { DecisionContextBuilder } from "./services/DecisionContextBuilder";
export { SupabaseActionRepository } from "./infrastructure/SupabaseActionRepository";
