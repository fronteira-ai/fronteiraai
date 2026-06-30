// ── Recommendation ────────────────────────────────────────────────────────────

export enum RecommendationCategory {
  Catalog      = "catalog",
  Trust        = "trust",
  Analytics    = "analytics",
  Profile      = "profile",
  Opportunity  = "opportunity",
  Operational  = "operational",
}

export enum RecommendationPriority {
  Critical = "critical",
  High     = "high",
  Medium   = "medium",
  Low      = "low",
}

export enum EstimatedEffort {
  Minutes = "minutes",
  Hours   = "hours",
  Days    = "days",
}

export enum RecommendationStatus {
  Active    = "active",
  Completed = "completed",
  Ignored   = "ignored",
  Postponed = "postponed",
  Expired   = "expired",
}

// ── Opportunity ───────────────────────────────────────────────────────────────

export enum OpportunityType {
  HighDemandProduct       = "high_demand_product",
  UnderExposedProduct     = "under_exposed_product",
  HighViewsLowContact     = "high_views_low_contact",
  NeverClickedProduct     = "never_clicked_product",
  OutOfStockAppearance    = "out_of_stock_appearance",
  CategoryGrowth          = "category_growth",
  LowSavesHighImpressions = "low_saves_high_impressions",
}

// ── Action ────────────────────────────────────────────────────────────────────

export enum ActionStatus {
  Pending   = "pending",
  Completed = "completed",
  Ignored   = "ignored",
  Postponed = "postponed",
}

// ── Impact Level ──────────────────────────────────────────────────────────────

export enum ImpactLevel {
  High   = "high",
  Medium = "medium",
  Low    = "low",
}
