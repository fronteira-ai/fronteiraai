import type { Merchant } from "@/types/merchant";
import type { ExecutiveSummary, CatalogIntelligence } from "@/src/domains/merchant-intelligence/types";
import type { MerchantAnalyticsSummary, ProductAnalyticsResult } from "@/src/domains/merchant-analytics/types";

export interface GrowthContext {
  merchant: Merchant;
  summary: ExecutiveSummary;
  catalog: CatalogIntelligence;
  analytics: MerchantAnalyticsSummary;
  products: ProductAnalyticsResult;
  timestamp: string;
}
