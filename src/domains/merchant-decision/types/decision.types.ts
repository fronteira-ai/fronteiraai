import type {
  RecommendationCategory,
  RecommendationPriority,
  EstimatedEffort,
  RecommendationStatus,
  OpportunityType,
  ActionStatus,
  ImpactLevel,
} from "./enums";
import type { ExecutiveSummary } from "@/src/domains/merchant-intelligence/types";
import type { MerchantHealth } from "@/src/domains/merchant-intelligence/types";
import type { CatalogIntelligence } from "@/src/domains/merchant-intelligence/types";
import type { MerchantAnalyticsSummary, ProductAnalyticsResult } from "@/src/domains/merchant-analytics/types";
import type { Merchant } from "@/types/merchant";

// ── Decision Context ──────────────────────────────────────────────────────────

export interface DecisionContext {
  merchant: Merchant;
  summary: ExecutiveSummary;
  health: MerchantHealth;
  catalog: CatalogIntelligence;
  analytics: MerchantAnalyticsSummary;
  products: ProductAnalyticsResult;
}

// ── Evidence ──────────────────────────────────────────────────────────────────

export interface Evidence {
  label: string;
  value: string | number;
  data_source: string;
}

// ── Recommendation ────────────────────────────────────────────────────────────

export interface Recommendation {
  id: string;
  rule_id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  description: string;
  expected_impact: string;
  estimated_effort: EstimatedEffort;
  estimated_minutes: number;
  reason: string;
  evidence: Evidence[];
  data_sources: string[];
  action_url: string | null;
  action_label: string | null;
  status: RecommendationStatus;
  created_at: string;
  expires_at: string | null;
}

// ── Opportunity ───────────────────────────────────────────────────────────────

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description: string;
  why_it_matters: string;
  how_to_act: string;
  expected_benefit: string;
  impact: ImpactLevel;
  evidence: Evidence[];
  product_id: string | null;
  category_id: string | null;
  detected_at: string;
}

// ── Decision Action (DB-persisted) ────────────────────────────────────────────

export interface DecisionAction {
  id: string;
  merchant_id: string;
  rule_id: string;
  recommendation_id: string;
  title: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  status: ActionStatus;
  notes: string | null;
  acted_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
}

// ── Priority Score (for ordering) ────────────────────────────────────────────

export interface PriorityScore {
  recommendation_id: string;
  score: number;
  score_breakdown: {
    impact_score: number;
    effort_score: number;
    urgency_score: number;
    category_weight: number;
  };
  explanation: string;
}

// ── Decision Center (unified response) ───────────────────────────────────────

export interface DecisionCenterData {
  merchant_id: string;
  todays_priorities: Recommendation[];
  all_recommendations: Recommendation[];
  opportunities: Opportunity[];
  pending_actions: DecisionAction[];
  completed_actions: DecisionAction[];
  total_recommendations: number;
  total_opportunities: number;
  generated_at: string;
}
