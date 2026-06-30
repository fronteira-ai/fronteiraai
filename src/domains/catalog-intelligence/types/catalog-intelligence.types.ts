import type { ProductHealthStatus, ProductDiagnosisType, CatalogTrend } from "./enums";

// ── Per-Product Diagnosis ─────────────────────────────────────────────────────

export interface ProductDiagnosis {
  type: ProductDiagnosisType;
  label: string;
  impact: string;
  severity: "critical" | "warning" | "info";
}

// ── Per-Product Health Record ─────────────────────────────────────────────────

export interface ProductHealthRecord {
  offer_id: string;
  product_id: string;
  product_name: string;
  image_url: string | null;
  price_usd: number;
  in_stock: boolean;
  status: ProductHealthStatus;
  score: number;
  diagnoses: ProductDiagnosis[];
  action_href: string;
}

// ── Catalog Health Breakdown (aggregate) ──────────────────────────────────────

export interface CatalogHealthBreakdown {
  ideal_count: number;
  attention_count: number;
  critical_count: number;
  total: number;
  ideal_pct: number;
  attention_pct: number;
  critical_pct: number;
  health_score: number;
}

// ── Daily Snapshot (persisted) ────────────────────────────────────────────────

export interface CatalogHealthSnapshot {
  snapshot_date: string; // YYYY-MM-DD
  health_score: number;
  products_ideal: number;
  products_attention: number;
  products_critical: number;
  total_products: number;
}

// ── History (last N days) ─────────────────────────────────────────────────────

export interface CatalogHealthHistory {
  merchant_id: string;
  snapshots: CatalogHealthSnapshot[];
  trend: CatalogTrend;
  generated_at: string;
}

// ── API Response: /api/merchant/catalog/health ────────────────────────────────

export interface CatalogHealthResponse {
  merchant_id: string;
  breakdown: CatalogHealthBreakdown;
  products_needing_attention: ProductHealthRecord[];
  generated_at: string;
}

// ── API Response: /api/merchant/catalog/products ──────────────────────────────

export interface CatalogProductsResponse {
  merchant_id: string;
  products: ProductHealthRecord[];
  total: number;
  page: number;
  limit: number;
  generated_at: string;
}
