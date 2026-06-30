import type {
  GrowthCategory,
  GrowthStrategyType,
  GrowthPriority,
  GrowthEffort,
  GrowthStatus,
  GrowthEventType,
  OpportunityCategory,
  PlanTier,
} from "./enums";

// ── Evidence ──────────────────────────────────────────────────────────────────

export interface GrowthEvidence {
  label: string;
  value: number | string;
  unit?: string;
}

// ── Priority Breakdown (transparent formula) ──────────────────────────────────

export interface GrowthPriorityBreakdown {
  impact_score: number;  // 0-40 — how much business value (driven by category + quantity)
  urgency_score: number; // 0-30 — time-sensitivity (driven by priority enum)
  ease_score: number;    // 0-20 — inverse of effort (Minutes=20, Hours=12, Days=5)
  context_score: number; // 0-10 — merchant maturity (lower score = higher context value)
  total_score: number;   // 0-100
  reason: string;        // human-readable explanation of why this appears first
}

// ── Draft Recommendation (before priority scoring) ────────────────────────────

export type DraftRecommendation = {
  id: string;
  strategy_id: GrowthStrategyType;
  category: GrowthCategory;
  subcategory: string;
  title: string;
  description: string;
  explanation: string;
  evidence: GrowthEvidence[];
  data_sources: string[];
  expected_impact: string;
  estimated_effort: GrowthEffort;
  estimated_minutes: number;
  priority: GrowthPriority;
  status: GrowthStatus;
  created_at: string;
  expires_at: string | null;
  action_url: string;
  action_label: string;
  plan_tier: PlanTier;
  moat_strengthened: string[];
  asset_strengthened: string[];
  opportunity_category: OpportunityCategory | null;
};

// ── Scored Recommendation (after priority scoring by PriorityEngine) ──────────

export interface GrowthRecommendation extends DraftRecommendation {
  priority_score: number;
  priority_breakdown: GrowthPriorityBreakdown;
}

// ── Today's Plan ──────────────────────────────────────────────────────────────

export interface TodaysPlan {
  merchant_id: string;
  date: string; // YYYY-MM-DD
  plan_items: GrowthRecommendation[];
  total_available: number;
  estimated_total_minutes: number;
  premium_items_available: number;
  generated_at: string;
}

// ── Opportunity Center ────────────────────────────────────────────────────────

export interface OpportunityCenter {
  merchant_id: string;
  opportunities: GrowthRecommendation[];
  total: number;
  generated_at: string;
}

// ── Growth History Entry ──────────────────────────────────────────────────────

export interface GrowthHistoryEntry {
  id: string;
  merchant_id: string;
  recommendation_id: string;
  strategy_id: string;
  category: string;
  title: string;
  event_type: GrowthEventType;
  occurred_at: string;
  metadata: Record<string, unknown>;
}

// ── Growth Timeline ───────────────────────────────────────────────────────────

export interface GrowthTimeline {
  merchant_id: string;
  entries: GrowthHistoryEntry[];
  total: number;
  generated_at: string;
}

// ── Growth Dashboard (unified response) ───────────────────────────────────────

export interface GrowthDashboard {
  merchant_id: string;
  todays_plan: TodaysPlan;
  opportunities: OpportunityCenter;
  all_recommendations: GrowthRecommendation[];
  recent_history: GrowthHistoryEntry[];
  generated_at: string;
}
