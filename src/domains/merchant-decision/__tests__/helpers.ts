import type { DecisionContext } from "../types/decision.types";
import type { ExecutiveSummary } from "@/src/domains/merchant-intelligence/types";
import type { MerchantHealth, CatalogIntelligence } from "@/src/domains/merchant-intelligence/types";
import type { MerchantAnalyticsSummary, ProductAnalyticsResult } from "@/src/domains/merchant-analytics/types";
import type { Merchant } from "@/types/merchant";
import { AnalyticsWindow } from "@/src/domains/merchant-analytics/types/enums";

const now = new Date().toISOString();

export function makeMerchant(overrides: Partial<Merchant> = {}): Merchant {
  return {
    id: "merchant-1",
    user_id: "user-1",
    company_name: "Loja Teste",
    company_doc: null,
    company_website: null,
    contact_phone: null,
    contact_whatsapp: "+5561999999999",
    contact_email: null,
    onboarding_step: 0,
    plan: "free",
    status: "active",
    verified_level: "none",
    onboarding_done: true,
    merchant_score: 50,
    trust_score: 60,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function makeSummary(overrides: Partial<ExecutiveSummary> = {}): ExecutiveSummary {
  return {
    merchantId: "merchant-1",
    companyName: "Loja Teste",
    plan: "free",
    totalProducts: 20,
    activeProducts: 15,
    incompleteProducts: 3,
    trustScore: 60,
    verificationCount: 1,
    activeSignalCount: 3,
    totalReviews: 5,
    averageRating: 4.2,
    contactsAvailable: 2,
    contactsTotal: 3,
    lastImportAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    lastImportSuccess: true,
    daysSinceLastImport: 10,
    onboardingDone: true,
    verifiedLevel: "basic",
    merchantScore: 60,
    generatedAt: now,
    ...overrides,
  };
}

export function makeHealth(overrides: Partial<MerchantHealth> = {}): MerchantHealth {
  return {
    merchantId: "merchant-1",
    dimensions: [],
    overallAttentionCount: 0,
    generatedAt: now,
    ...overrides,
  };
}

export function makeCatalog(overrides: Partial<CatalogIntelligence> = {}): CatalogIntelligence {
  return {
    merchantId: "merchant-1",
    totalProducts: 20,
    healthScore: 80,
    issues: [],
    insights: [],
    lastImportAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    daysSinceLastImport: 10,
    generatedAt: now,
    ...overrides,
  };
}

export function makeAnalytics(overrides: Partial<MerchantAnalyticsSummary> = {}): MerchantAnalyticsSummary {
  return {
    merchant_id: "merchant-1",
    window: AnalyticsWindow.Last30Days,
    views: 100,
    unique_visitors: 80,
    product_impressions: 500,
    product_clicks: 50,
    contact_clicks: 10,
    whatsapp_clicks: 8,
    phone_clicks: 2,
    website_clicks: 0,
    offer_saves: 5,
    ctr: 10,
    generated_at: now,
    ...overrides,
  };
}

export function makeProducts(overrides: Partial<ProductAnalyticsResult> = {}): ProductAnalyticsResult {
  return {
    merchant_id: "merchant-1",
    window: AnalyticsWindow.Last30Days,
    products: [],
    total_analyzed: 0,
    generated_at: now,
    ...overrides,
  };
}

export function makeContext(overrides: Partial<DecisionContext> = {}): DecisionContext {
  return {
    merchant: makeMerchant(),
    summary: makeSummary(),
    health: makeHealth(),
    catalog: makeCatalog(),
    analytics: makeAnalytics(),
    products: makeProducts(),
    ...overrides,
  };
}
