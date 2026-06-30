// ── Types & Enums ──────────────────────────────────────────────────────────────
export * from "./types/enums";
export type {
  GrowthEvidence,
  GrowthPriorityBreakdown,
  DraftRecommendation,
  GrowthRecommendation,
  TodaysPlan,
  OpportunityCenter,
  GrowthHistoryEntry,
  GrowthTimeline,
  GrowthDashboard,
} from "./types/growth.types";

// ── Domain ────────────────────────────────────────────────────────────────────
export type { GrowthContext } from "./domain/GrowthContext";

// ── Strategies ────────────────────────────────────────────────────────────────
export type { GrowthStrategy } from "./strategies/GrowthStrategy";
export { StrategyRegistry } from "./strategies/StrategyRegistry";
export { bootstrapStrategies } from "./strategies/bootstrap";

// ── Services ──────────────────────────────────────────────────────────────────
export {
  GrowthContextBuilder,
  RecommendationEngine,
  PriorityEngine,
  TodaysPlanService,
  OpportunityCenterService,
  GrowthHistoryService,
} from "./services";

// ── Repository Interfaces ─────────────────────────────────────────────────────
export type { IGrowthHistoryRepository } from "./repositories/IGrowthHistoryRepository";

// ── Infrastructure ────────────────────────────────────────────────────────────
export { SupabaseGrowthHistoryRepository } from "./infrastructure/SupabaseGrowthHistoryRepository";
