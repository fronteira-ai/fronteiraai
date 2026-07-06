// Public API of the Market Intelligence Engine (Release 1.8 — Program C —
// Market Intelligence Engine, Wave 1).
//
// Foundation domain like `canonical-catalog`/`exchange`/`realtime-commerce`:
// depends on them (all three are safe to depend on — none depends back on
// this one or on each other in a way that would cycle), never the other way
// around. Never imports `connectors/`, `marketplace-operations/`, or
// `catalog-intelligence/` — this domain is exclusively about turning price
// data already flowing through Canonical Catalog + Real-Time Commerce +
// Exchange into reusable, screen-agnostic insight. No UI, no dashboards, no
// public API routes — every service here is meant to be called by another
// service (Brain, Marketplace, Search, a future Home, a future mobile API),
// never by a page directly.
//
// Explicitly NOT duplicated here (see docs/engineering/MARKET_INTELLIGENCE_ENGINE.md
// for the full audit): Merchant Intelligence (Objective 7) is already covered
// by `StoreUpdateIntelligenceService`/`MerchantPriorityService`/
// `ConnectorObservabilityService`/`ProductHealthService` — no new service
// was written for it, on purpose.

export * from "./types";

export { PriceIntelligenceService, computePriceStatistics, computeSavingsOpportunity } from "./services/PriceIntelligenceService";
export type { StoreOfferPrice } from "./services/PriceIntelligenceService";

export { VolatilityRollupService } from "./services/VolatilityRollupService";

export { PriceHistoryQueryService } from "./services/PriceHistoryQueryService";

export { MarketPulseInsightsService } from "./services/MarketPulseInsightsService";
