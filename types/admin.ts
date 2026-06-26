export type AdminRole = "admin" | "operator";

export interface Profile {
  id: string;
  email: string;
  role: AdminRole;
  created_at: string;
}

export interface DashboardStats {
  products: number;
  offers: number;
  stores: number;
  brands: number;
  categories: number;
  priceHistoryEntries: number;
  lastImport: ImportLog | null;
}

export interface ImportLog {
  id: string;
  connector_id: string;
  batch_id: string;
  dry_run: boolean;
  success: boolean;
  total_raw: number;
  total_persisted: number;
  total_errors: number;
  metrics: Record<string, unknown>;
  errors: unknown[] | null;
  created_at: string;
}

export interface QualityIssue {
  type: string;
  severity: "error" | "warning" | "info";
  count: number;
  label: string;
  records: Record<string, unknown>[];
}

export interface QualityReport {
  generatedAt: string;
  issues: QualityIssue[];
}

export interface AdminApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}
