// ── Trust Status ─────────────────────────────────────────────────────────────
export enum TrustStatus {
  Unverified = "unverified",
  Pending = "pending",
  Verified = "verified",
  Suspended = "suspended",
  Rejected = "rejected",
}

export enum TrustSignal {
  DataFreshness = "data_freshness",
  ProductImageCoverage = "product_image_coverage",
  MerchantAge = "merchant_age",
  VerificationStatus = "verification_status",
  ReviewScore = "review_score",
  ResponseTime = "response_time",
}

export enum TrustBadge {
  None = "none",
  Basic = "basic",
  Verified = "verified",
  Premium = "premium",
}

// ── Trust Signals (public-facing) ────────────────────────────────────────────
export enum TrustSignalType {
  CompanyVerified = "company_verified",
  IdentityValidated = "identity_validated",
  LocationConfirmed = "location_confirmed",
  ContactConfirmed = "contact_confirmed",
  HoursConfirmed = "hours_confirmed",
  OfficialPartner = "official_partner",
  DocumentationVerified = "documentation_verified",
  RecurringOperation = "recurring_operation",
  // Legacy
  DocumentVerified = "document_verified",
  AddressVerified = "address_verified",
  PhoneVerified = "phone_verified",
  EmailVerified = "email_verified",
  BankVerified = "bank_verified",
  SocialMediaVerified = "social_media_verified",
  ManualVerified = "manual_verified",
}

export enum TrustSignalStatus {
  Active = "active",
  Inactive = "inactive",
  Expired = "expired",
  Revoked = "revoked",
}

export enum TrustSignalCategory {
  Identity = "identity",
  Business = "business",
  Operational = "operational",
  Compliance = "compliance",
}

export enum SignalTrustLevel {
  High = "high",
  Medium = "medium",
  Low = "low",
}

// ── Verification ─────────────────────────────────────────────────────────────
export enum VerificationType {
  Document = "document",
  Address = "address",
  Phone = "phone",
  Email = "email",
  Bank = "bank",
  SocialMedia = "social_media",
  Manual = "manual",
  Identity = "identity",
  Company = "company",
  Location = "location",
  Contact = "contact",
  Hours = "hours",
  Operation = "operation",
  Partner = "partner",
  Documentation = "documentation",
}

export enum VerificationStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
  Expired = "expired",
  Revoked = "revoked",
}

export enum VerificationAction {
  Created = "created",
  Submitted = "submitted",
  Approved = "approved",
  Rejected = "rejected",
  Revoked = "revoked",
  Expired = "expired",
  EvidenceAdded = "evidence_added",
  EvidenceRemoved = "evidence_removed",
  MetadataUpdated = "metadata_updated",
}

export enum VerificationCategory {
  Identity = "identity",
  Business = "business",
  Operational = "operational",
  Compliance = "compliance",
}

export enum EvidenceType {
  Document = "document",
  Image = "image",
  Url = "url",
  Text = "text",
  Json = "json",
}

// ── Reviews ──────────────────────────────────────────────────────────────────
export enum ReviewStatus {
  Pending = "pending",
  Approved = "approved",
  Hidden = "hidden",
  Removed = "removed",
}

export enum ReviewAction {
  Created = "created",
  Edited = "edited",
  Approved = "approved",
  Hidden = "hidden",
  Removed = "removed",
  Restored = "restored",
  MerchantReplied = "merchant_replied",
  ReportAdded = "report_added",
  MarkedHelpful = "marked_helpful",
}

export enum ReviewReportReason {
  Spam = "spam",
  Fake = "fake",
  Offensive = "offensive",
  Irrelevant = "irrelevant",
  ConflictOfInterest = "conflict_of_interest",
  Other = "other",
}

export enum ReviewReportStatus {
  Pending = "pending",
  Reviewed = "reviewed",
  Dismissed = "dismissed",
  Actioned = "actioned",
}

// ── Timeline ─────────────────────────────────────────────────────────────────
export enum TimelineEventType {
  VerificationApproved = "verification_approved",
  VerificationRevoked = "verification_revoked",
  VerificationSubmitted = "verification_submitted",
  ReviewReceived = "review_received",
  BadgeGranted = "badge_granted",
  BadgeRevoked = "badge_revoked",
  PartnerConfirmed = "partner_confirmed",
  DocumentSubmitted = "document_submitted",
  ContactConfirmed = "contact_confirmed",
  ProfileUpdated = "profile_updated",
  FirstSaleRecorded = "first_sale_recorded",
  RecurringOperationConfirmed = "recurring_operation_confirmed",
  TrustSignalActivated = "trust_signal_activated",
  TrustSignalRevoked = "trust_signal_revoked",
  MerchantJoined = "merchant_joined",
}

export enum TimelineEventCategory {
  Verification = "verification",
  Review = "review",
  Badge = "badge",
  Profile = "profile",
  Operational = "operational",
}

export enum TimelineVisibility {
  Public = "public",
  MerchantOnly = "merchant_only",
  AdminOnly = "admin_only",
}

// ── Merchant Passport ─────────────────────────────────────────────────────────
export enum PassportSection {
  Overview = "overview",
  Trust = "trust",
  Timeline = "timeline",
  Reviews = "reviews",
  Info = "info",
}

export enum MerchantChannelType {
  Website = "website",
  WhatsApp = "whatsapp",
  Phone = "phone",
  Email = "email",
}

// ── Trust Events (Brain) ─────────────────────────────────────────────────────
export enum TrustEventType {
  MerchantViewed = "merchant_viewed",
  MerchantVerified = "merchant_verified",
  TrustUpdated = "trust_updated",
  BadgeGranted = "badge_granted",
  BadgeRemoved = "badge_removed",
  BadgeClicked = "badge_clicked",
  ReviewCreated = "review_created",
  ReviewUpdated = "review_updated",
  ReviewModerated = "review_moderated",
  ReviewReported = "review_reported",
  ReviewHelpfulMarked = "review_helpful_marked",
  VerificationSubmitted = "verification_submitted",
  VerificationApproved = "verification_approved",
  VerificationRejected = "verification_rejected",
  VerificationRevoked = "verification_revoked",
  VerificationViewed = "verification_viewed",
  EvidenceAdded = "evidence_added",
  EvidenceRemoved = "evidence_removed",
  EvidenceOpened = "evidence_opened",
  MerchantProfileViewed = "merchant_profile_viewed",
  TrustSignalViewed = "trust_signal_viewed",
  TrustSignalActivated = "trust_signal_activated",
  TrustSignalRevoked = "trust_signal_revoked",
  TimelineViewed = "timeline_viewed",
  // Epic 3 — Merchant Identity
  MerchantPassportViewed = "merchant_passport_viewed",
  MerchantFactExpanded = "merchant_fact_expanded",
  MerchantTimelineInteraction = "merchant_timeline_interaction",
  MerchantReviewInteraction = "merchant_review_interaction",
  MerchantProfileShared = "merchant_profile_shared",
  MerchantContactClicked = "merchant_contact_clicked",
  MerchantLocationViewed = "merchant_location_viewed",
  // Release 1.6 — Command Center
  CommandCenterViewed = "command_center_viewed",
  CommandCenterWidgetOpened = "command_center_widget_opened",
  CommandCenterQuickActionClicked = "command_center_quick_action_clicked",
  CommandCenterCatalogIssueViewed = "command_center_catalog_issue_viewed",
  CommandCenterCatalogIssueResolved = "command_center_catalog_issue_resolved",
  CommandCenterHealthViewed = "command_center_health_viewed",
  CommandCenterFilterChanged = "command_center_filter_changed",
  CommandCenterSummaryExported = "command_center_summary_exported",
  // Release 1.6 — Analytics Platform
  AnalyticsSearchPerformed = "analytics_search_performed",
  AnalyticsProductImpression = "analytics_product_impression",
  AnalyticsProductClicked = "analytics_product_clicked",
  AnalyticsProductCompared = "analytics_product_compared",
  AnalyticsMerchantViewed = "analytics_merchant_viewed",
  AnalyticsMerchantPassportViewed = "analytics_merchant_passport_viewed",
  AnalyticsMerchantContactClicked = "analytics_merchant_contact_clicked",
  AnalyticsMerchantWhatsAppClicked = "analytics_merchant_whatsapp_clicked",
  AnalyticsMerchantPhoneClicked = "analytics_merchant_phone_clicked",
  AnalyticsMerchantWebsiteClicked = "analytics_merchant_website_clicked",
  AnalyticsMerchantLocationViewed = "analytics_merchant_location_viewed",
  AnalyticsOfferViewed = "analytics_offer_viewed",
  AnalyticsOfferClicked = "analytics_offer_clicked",
  AnalyticsOfferSaved = "analytics_offer_saved",
  AnalyticsCategoryViewed = "analytics_category_viewed",
  AnalyticsBrandViewed = "analytics_brand_viewed",
  AnalyticsSessionStarted = "analytics_session_started",
  AnalyticsSessionEnded = "analytics_session_ended",
  // Release 1.6 — Decision Engine
  DecisionCenterViewed         = "decision_center_viewed",
  RecommendationGenerated      = "recommendation_generated",
  RecommendationViewed         = "recommendation_viewed",
  RecommendationAccepted       = "recommendation_accepted",
  RecommendationDismissed      = "recommendation_dismissed",
  ActionCompleted              = "action_completed",
  ActionPostponed              = "action_postponed",
  OpportunityDetected          = "opportunity_detected",
  OpportunityResolved          = "opportunity_resolved",
  PriorityChanged              = "priority_changed",
  // Release 1.6 — Catalog Intelligence
  CatalogIntelligenceViewed    = "catalog_intelligence_viewed",
  CatalogProductHealthViewed   = "catalog_product_health_viewed",
  CatalogSnapshotRecorded      = "catalog_snapshot_recorded",
  CatalogIssueIdentified       = "catalog_issue_identified",
  CatalogHealthImproved        = "catalog_health_improved",
  CatalogProductFixed          = "catalog_product_fixed",

  // ── Growth Engine ───────────────────────────────────────────────────────────
  GrowthCenterViewed             = "growth_center_viewed",
  GrowthPlanGenerated            = "growth_plan_generated",
  GrowthRecommendationViewed     = "growth_recommendation_viewed",
  GrowthRecommendationAccepted   = "growth_recommendation_accepted",
  GrowthRecommendationIgnored    = "growth_recommendation_ignored",
  GrowthRecommendationCompleted  = "growth_recommendation_completed",
  GrowthOpportunityIdentified    = "growth_opportunity_identified",
  GrowthOpportunityCenterViewed  = "growth_opportunity_center_viewed",
  GrowthStrategyEvaluated        = "growth_strategy_evaluated",
  GrowthContextBuilt             = "growth_context_built",
  GrowthTimelineViewed           = "growth_timeline_viewed",
  GrowthScoreComputed            = "growth_score_computed",
}

export enum TrustSource {
  System = "system",
  Admin = "admin",
  Merchant = "merchant",
  Buyer = "buyer",
  Crawler = "crawler",
}

export enum TrustReason {
  DataQuality = "data_quality",
  ManualReview = "manual_review",
  VerificationCompleted = "verification_completed",
  ReviewApproved = "review_approved",
  InactivityDecay = "inactivity_decay",
  PolicyViolation = "policy_violation",
  AdminAction = "admin_action",
}

export enum BrainAsset {
  HistoricalData = "historical_data",
  MerchantTrust = "merchant_trust",
  KnowledgeGraph = "knowledge_graph",
  BuyerBehavioralKnowledge = "buyer_behavioral_knowledge",
  SearchIntelligence = "search_intelligence",
  RecommendationKnowledge = "recommendation_knowledge",
}

// ── Cognitive Brain (Epic 4) ─────────────────────────────────────────────────
export enum BrainEntityType {
  Merchant = "merchant",
  Review = "review",
  Verification = "verification",
  Signal = "signal",
  Badge = "badge",
  Timeline = "timeline",
  Passport = "passport",
  Buyer = "buyer",
  Product = "product",
  CommandCenter = "command_center",
}

export enum GraphRelationType {
  BuyerViewed = "buyer_viewed",
  BuyerReviewed = "buyer_reviewed",
  BuyerContactedVia = "buyer_contacted_via",
  BuyerSharedProfile = "buyer_shared_profile",
  MerchantHasVerification = "merchant_has_verification",
  MerchantHasSignal = "merchant_has_signal",
  MerchantHasReview = "merchant_has_review",
  MerchantHasTimeline = "merchant_has_timeline",
  ReviewLinkedToBuyer = "review_linked_to_buyer",
  SearchLedToView = "search_led_to_view",
}

export enum CognitiveBrainActorRole {
  Buyer = "buyer",
  Merchant = "merchant",
  Admin = "admin",
  System = "system",
}
