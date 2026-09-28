// ── Analytics Event Types ─────────────────────────────────────────────────────

export enum AnalyticsEventType {
  // Search
  SearchPerformed       = "SearchPerformed",
  SearchResultViewed    = "SearchResultViewed",
  // Mission 01 (C1) — busca sem NENHUM resultado. Aditivo: sem ele, "termo
  // ruim" e "falha de infraestrutura" são indistinguíveis em buyer_events,
  // porque SearchPerformed é emitido nos dois casos.
  SearchZeroResults     = "SearchZeroResults",
  // Mission 02A — SUBMISSÃO de busca no PONTO DE INTERAÇÃO (ex.: SearchBar da
  // Home). Aditivo e deliberadamente separado de `SearchPerformed`, que é o
  // PAGE VIEW de /search (SearchViewTracker) e já é contado por event_type em
  // FunnelService e agregado por services/search-suggestions.service.ts.
  // Submeter uma busca e VER a página de resultado são dois passos distintos
  // do funil; colapsá-los num só tipo tornaria os dois impossíveis de
  // interpretar. A única fonte da decisão de emitir é
  // utils/buyerEvents.ts (searchSubmitDecision). Nenhum consumidor existente
  // é afetado.
  SearchSubmitted       = "SearchSubmitted",
  // Products
  ProductImpression     = "ProductImpression",
  ProductClicked        = "ProductClicked",
  // Mission 01 (C2) — clique em um produto a partir de uma LISTA (Home,
  // /search, catálogo, relacionados). Aditivo e deliberadamente separado de
  // `ProductClicked`, que é emitido como PAGE VIEW por ProductViewTracker e
  // já é lido por contagem-por-tipo em FunnelService/MerchantAnalyticsService/
  // OpportunityEngine — ver utils/buyerEvents.ts.
  ProductClickedFromList = "ProductClickedFromList",
  ProductCompared       = "ProductCompared",
  // Merchant
  MerchantViewed        = "MerchantViewed",
  MerchantPassportViewed = "MerchantPassportViewed",
  MerchantContactClicked = "MerchantContactClicked",
  MerchantWhatsAppClicked = "MerchantWhatsAppClicked",
  MerchantPhoneClicked  = "MerchantPhoneClicked",
  MerchantWebsiteClicked = "MerchantWebsiteClicked",
  MerchantLocationViewed = "MerchantLocationViewed",
  // Offers
  OfferViewed           = "OfferViewed",
  OfferClicked          = "OfferClicked",
  OfferSaved            = "OfferSaved",
  // Trust
  ReviewViewed          = "ReviewViewed",
  TrustSignalViewed     = "TrustSignalViewed",
  TimelineViewed        = "TimelineViewed",
  // Discovery
  CategoryViewed        = "CategoryViewed",
  BrandViewed           = "BrandViewed",
  // Session
  SessionStarted        = "SessionStarted",
  SessionEnded          = "SessionEnded",
}

// ── Device Types ──────────────────────────────────────────────────────────────

export enum DeviceType {
  Desktop = "desktop",
  Mobile  = "mobile",
  Tablet  = "tablet",
  Unknown = "unknown",
}

// ── Funnel Steps ──────────────────────────────────────────────────────────────

export enum FunnelStep {
  Search      = "search",
  Impression  = "impression",
  Click       = "click",
  MerchantView = "merchant_view",
  Contact     = "contact",
  Save        = "save",
}

// ── Analytics Time Window ─────────────────────────────────────────────────────

export enum AnalyticsWindow {
  Today     = "today",
  Last7Days = "last_7_days",
  Last30Days = "last_30_days",
  Last90Days = "last_90_days",
}
