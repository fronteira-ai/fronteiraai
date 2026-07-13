// Public API of the Buyer Intelligence Layer (Release 2.0 — Wave 1).
// Composition-only domain — no domain/, repositories/, or infrastructure/
// folders, because there is no new aggregate and no new data: every
// composer here reads canonical-catalog/market-insights/realtime-commerce/
// trust services that already exist and are already tested. See
// docs/product/BUYER_INTELLIGENCE_LAYER.md.

export * from "./types/buyer-intelligence.types";

export { ComparisonIntelligenceComposer } from "./services/ComparisonIntelligenceComposer";
export { ProductIntelligenceComposer } from "./services/ProductIntelligenceComposer";
export { SearchIntelligenceComposer } from "./services/SearchIntelligenceComposer";
export type { SearchIntelligenceInput } from "./services/SearchIntelligenceComposer";
export { BestDealComposer } from "./services/BestDealComposer";
export { PurchaseTimingComposer } from "./services/PurchaseTimingComposer";
export { TrustComposer } from "./services/TrustComposer";
export { ParaguAIAdvisorComposer } from "./services/ParaguAIAdvisorComposer";
