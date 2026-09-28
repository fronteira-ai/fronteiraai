// ── Analytics Event Types ─────────────────────────────────────────────────────

export enum AnalyticsEventType {
  // Search
  SearchPerformed       = "SearchPerformed",
  SearchResultViewed    = "SearchResultViewed",
  // Mission 01 (C1) — busca sem NENHUM resultado. Aditivo: sem ele, "termo
  // ruim" e "falha de infraestrutura" são indistinguíveis em buyer_events,
  // porque SearchPerformed é emitido nos dois casos.
  SearchZeroResults     = "SearchZeroResults",
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
