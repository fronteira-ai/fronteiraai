// ── Growth Category ───────────────────────────────────────────────────────────

export enum GrowthCategory {
  Catalog = "catalog",
  Trust = "trust",
  Visibility = "visibility",
  Pricing = "pricing",
  Demand = "demand",
  Freshness = "freshness",
  Profile = "profile",
  Traffic = "traffic",
  Conversation = "conversation",
  Review = "review",
}

// ── Strategy Types ────────────────────────────────────────────────────────────

export enum GrowthStrategyType {
  CatalogGrowth = "catalog_growth",
  TrustGrowth = "trust_growth",
  Visibility = "visibility",
  PricingOpportunity = "pricing_opportunity",
  DemandOpportunity = "demand_opportunity",
  Freshness = "freshness",
  MerchantProfile = "merchant_profile",
  TrafficOpportunity = "traffic_opportunity",
  Conversation = "conversation",
  ReviewGrowth = "review_growth",
}

// ── Priority ──────────────────────────────────────────────────────────────────

export enum GrowthPriority {
  Critical = "critical",
  High = "high",
  Medium = "medium",
  Low = "low",
}

// ── Effort ────────────────────────────────────────────────────────────────────

export enum GrowthEffort {
  Minutes = "minutes",
  Hours = "hours",
  Days = "days",
}

// ── Status ────────────────────────────────────────────────────────────────────

export enum GrowthStatus {
  New = "new",
  Viewed = "viewed",
  Accepted = "accepted",
  Ignored = "ignored",
  Completed = "completed",
}

// ── History Event Type ────────────────────────────────────────────────────────

export enum GrowthEventType {
  Viewed = "viewed",
  Accepted = "accepted",
  Ignored = "ignored",
  Completed = "completed",
}

// ── Opportunity Category ──────────────────────────────────────────────────────

export enum OpportunityCategory {
  HighDemand = "high_demand",
  LowCoverage = "low_coverage",
  GrowingCategory = "growing_category",
  NeglectedProduct = "neglected_product",
  StrategicProduct = "strategic_product",
  IncompleteCatalog = "incomplete_catalog",
  IncompleteProfile = "incomplete_profile",
  IncompleteTrust = "incomplete_trust",
}

// ── Plan Tier ─────────────────────────────────────────────────────────────────

export enum PlanTier {
  Free = "free",
  Premium = "premium",
  Enterprise = "enterprise",
}
