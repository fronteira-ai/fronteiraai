// ── Health Dimension Status ───────────────────────────────────────────────────

export enum HealthStatus {
  Excellent = "excelente",
  Good = "bom",
  Regular = "regular",
  Attention = "atencao",
}

// ── Health Dimensions ─────────────────────────────────────────────────────────

export enum HealthDimension {
  Catalog = "catalogo",
  Trust = "trust",
  Updates = "atualizacao",
  Profile = "perfil",
  Visibility = "visibilidade",
}

// ── Catalog Issue Types ───────────────────────────────────────────────────────

export enum CatalogIssueType {
  NoImage = "no_image",
  NoCategory = "no_category",
  NoBrand = "no_brand",
  NoPrice = "no_price",
  NoDescription = "no_description",
  StaleImport = "stale_import",
  NoProducts = "no_products",
}

// ── Catalog Insight Severity ──────────────────────────────────────────────────

export enum InsightSeverity {
  Critical = "critical",
  Warning = "warning",
  Info = "info",
}

// ── Quick Action Priority ─────────────────────────────────────────────────────

export enum ActionPriority {
  Critical = "critical",
  High = "high",
  Medium = "medium",
  Low = "low",
}
