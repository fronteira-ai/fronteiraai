// ── Analytics Event Types ─────────────────────────────────────────────────────

export enum AnalyticsEventType {
  // Search
  SearchPerformed       = "SearchPerformed",
  SearchResultViewed    = "SearchResultViewed",
  // Products
  ProductImpression     = "ProductImpression",
  ProductClicked        = "ProductClicked",
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
