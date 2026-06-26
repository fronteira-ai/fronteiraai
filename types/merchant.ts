export type MerchantStatus = "draft" | "pending" | "active" | "suspended" | "blocked";
export type MerchantPlan = "free" | "pro" | "business" | "enterprise";
export type VerifiedLevel = "none" | "verified" | "premium" | "official";
export type AuditEventType =
  | "login" | "logout" | "register"
  | "import_run" | "import_complete" | "import_failed"
  | "product_added" | "product_updated" | "product_deleted"
  | "price_changed" | "store_linked" | "store_unlinked"
  | "onboarding_step" | "onboarding_complete"
  | "plan_changed" | "settings_updated";

export type RecommendationPriority = "critical" | "warning" | "info";

export interface Merchant {
  id: string;
  user_id: string;
  company_name: string;
  company_doc: string | null;
  company_website: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  onboarding_step: number;
  onboarding_done: boolean;
  status: MerchantStatus;
  plan: MerchantPlan;
  merchant_score: number;
  trust_score: number;
  verified_level: VerifiedLevel;
  created_at: string;
  updated_at: string;
}

export interface MerchantStore {
  id: string;
  merchant_id: string;
  store_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface MerchantPlanFeatures {
  plan: MerchantPlan;
  display_name: string;
  max_stores: number;
  max_products: number;
  max_imports_month: number;
  has_api_access: boolean;
  has_analytics: boolean;
  has_connectors: boolean;
  has_priority_rank: boolean;
  price_monthly: number;
}

export interface MerchantAuditLog {
  id: string;
  merchant_id: string | null;
  user_id: string | null;
  event_type: AuditEventType;
  payload: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface MerchantRecommendation {
  id: string;
  merchant_id: string;
  type: string;
  priority: RecommendationPriority;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface MerchantAnalyticsEvent {
  id: string;
  merchant_id: string | null;
  store_id: string | null;
  product_id: string | null;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Dashboard aggregates
export interface MerchantDashboardStats {
  totalProducts: number;
  activeProducts: number;
  productsNoImage: number;
  productsNoCategory: number;
  productsNoPrice: number;
  totalStores: number;
  lastImportAt: string | null;
  lastImportSuccess: boolean | null;
  lastImportCount: number;
  merchantScore: number;
  trustScore: number;
}

// Score breakdown (M05)
export interface MerchantScoreBreakdown {
  total: number;
  items: { label: string; points: number; earned: boolean; hint?: string }[];
}

// Score level (M05 — Gamification)
export interface MerchantLevel {
  id: "iniciante" | "bronze" | "prata" | "ouro" | "diamante" | "elite";
  name: string;
  min: number;
  max: number;
  color: string;
  bgColor: string;
  next: string | null;
  pointsToNext: number;
}

// Single priority next action
export interface NextStep {
  id: string;
  title: string;
  description: string;
  benefit: string;
  cta: string;
  href: string;
  urgency: "critical" | "high" | "medium";
  estimatedMinutes: number;
}

// Growth goal with progress
export interface MerchantGoal {
  id: string;
  label: string;
  description: string;
  achieved: boolean;
  current: number;
  target: number;
  progress: number;
  icon: string;
}
