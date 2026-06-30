// ── Per-Product Health Status ─────────────────────────────────────────────────

export enum ProductHealthStatus {
  Ideal = "ideal",
  Attention = "attention",
  Critical = "critical",
}

// ── Product Diagnosis Types ───────────────────────────────────────────────────

export enum ProductDiagnosisType {
  NoImage = "no_image",
  NoCategory = "no_category",
  NoBrand = "no_brand",
  NoDescription = "no_description",
  NoPrice = "no_price",
  OutOfStock = "out_of_stock",
}

// ── History Trend ─────────────────────────────────────────────────────────────

export type CatalogTrend = "improving" | "stable" | "declining";
