// ── Marketplace Health (Epic 2) ───────────────────────────────────────────────

export enum MarketplaceHealthFactor {
  ConnectorHealth = "connector_health",
  Freshness = "freshness",
  Coverage = "coverage",
  CanonicalCatalog = "canonical_catalog",
  Discovery = "discovery",
  Claims = "claims",
  AnalyticsBrainVolume = "analytics_brain_volume",
  ConnectorErrors = "connector_errors",
}

export enum MarketplaceHealthStatus {
  Healthy = "healthy",
  Attention = "attention",
  Critical = "critical",
}

// ── Merchant Priority (Epic 3) ─────────────────────────────────────────────────

export enum MerchantPriorityTier {
  Diamond = "diamond",
  Gold = "gold",
  Silver = "silver",
  Bronze = "bronze",
}

export enum MerchantBusinessClass {
  StrategicPartner = "strategic_partner",
  GrowthAccount = "growth_account",
  StandardAccount = "standard_account",
  DormantAccount = "dormant_account",
}

// ── Coverage (Epic 4) ──────────────────────────────────────────────────────────

export enum CoverageDimension {
  Category = "category",
  Brand = "brand",
  City = "city",
}

// ── Alerts (Epic 8) ────────────────────────────────────────────────────────────

export enum MarketplaceAlertType {
  ConnectorDown = "connector_down",
  StoreNotSyncing = "store_not_syncing",
  LowCoverage = "low_coverage",
  DiscoveryStalled = "discovery_stalled",
  ClaimPending = "claim_pending",
  CanonicalMergeBacklog = "canonical_merge_backlog",
  HealthScoreDropped = "health_score_dropped",
  LowFreshness = "low_freshness",
}

export enum MarketplaceAlertSeverity {
  Critical = "critical",
  Warning = "warning",
  Info = "info",
}

export enum MarketplaceAlertStatus {
  Pending = "pending",
  Acknowledged = "acknowledged",
  Resolved = "resolved",
  Ignored = "ignored",
}

export type MarketplaceAlertSubjectType = "connector" | "store" | "category" | "brand" | "marketplace";
