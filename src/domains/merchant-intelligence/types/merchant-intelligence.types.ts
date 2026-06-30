import type {
  HealthStatus,
  HealthDimension,
  CatalogIssueType,
  InsightSeverity,
  ActionPriority,
} from "./enums";

// ── Executive Summary ─────────────────────────────────────────────────────────

export interface ExecutiveSummary {
  merchantId: string;
  companyName: string;
  plan: string;
  // Catalog
  totalProducts: number;
  activeProducts: number;
  incompleteProducts: number;
  // Trust
  trustScore: number;
  verificationCount: number;
  activeSignalCount: number;
  // Engagement
  totalReviews: number;
  averageRating: number | null;
  // Contact
  contactsAvailable: number;
  contactsTotal: number;
  // Recency
  lastImportAt: string | null;
  lastImportSuccess: boolean | null;
  daysSinceLastImport: number | null;
  // Merchant
  onboardingDone: boolean;
  verifiedLevel: string;
  merchantScore: number;
  generatedAt: string;
}

// ── Merchant Health ───────────────────────────────────────────────────────────

export interface HealthDimensionResult {
  dimension: HealthDimension;
  label: string;
  status: HealthStatus;
  statusLabel: string;
  reason: string;
  howToImprove: string | null;
  icon: string;
}

export interface MerchantHealth {
  merchantId: string;
  dimensions: HealthDimensionResult[];
  overallAttentionCount: number;
  generatedAt: string;
}

// ── Catalog Intelligence ──────────────────────────────────────────────────────

export interface CatalogIssue {
  type: CatalogIssueType;
  severity: InsightSeverity;
  label: string;
  count: number;
  total: number;
  percentage: number;
  description: string;
  impact: string;
  actionHref: string;
  actionLabel: string;
}

export interface CatalogInsight {
  severity: InsightSeverity;
  message: string;
  why: string;
}

export interface CatalogIntelligence {
  merchantId: string;
  totalProducts: number;
  healthScore: number;
  issues: CatalogIssue[];
  insights: CatalogInsight[];
  lastImportAt: string | null;
  daysSinceLastImport: number | null;
  generatedAt: string;
}

// ── Quick Actions ─────────────────────────────────────────────────────────────

export interface QuickAction {
  id: string;
  priority: ActionPriority;
  title: string;
  description: string;
  reason: string;
  impact: string;
  href: string;
  icon: string;
  estimatedMinutes: number;
}

export interface QuickActionsResult {
  merchantId: string;
  actions: QuickAction[];
  generatedAt: string;
}

// ── Unified Command Center response ──────────────────────────────────────────

export interface CommandCenterData {
  summary: ExecutiveSummary;
  health: MerchantHealth;
  catalog: CatalogIntelligence;
  quickActions: QuickActionsResult;
}
