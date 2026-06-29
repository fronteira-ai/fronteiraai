import type {
  TrustStatus,
  TrustBadge,
  TrustEventType,
  TrustSource,
  TrustReason,
  VerificationType,
  VerificationStatus,
  VerificationAction,
  VerificationCategory,
  EvidenceType,
  TrustSignal,
  TrustSignalType,
  TrustSignalStatus,
  TrustSignalCategory,
  SignalTrustLevel,
  ReviewStatus,
  ReviewAction,
  ReviewReportReason,
  ReviewReportStatus,
  TimelineEventType,
  TimelineEventCategory,
  TimelineVisibility,
  MerchantChannelType,
} from "./enums";

// ── Core Trust Records ────────────────────────────────────────────────────────

export interface MerchantTrustRecord {
  id: string;
  merchant_id: string;
  trust_score: number;
  status: TrustStatus;
  badge_level: TrustBadge;
  last_verified_at: string | null;
  last_event_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrustEventRecord {
  id: string;
  merchant_id: string;
  merchant_trust_id: string | null;
  event_type: TrustEventType;
  source: TrustSource;
  reason: TrustReason | null;
  delta: number;
  score_before: number | null;
  score_after: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
}

export interface MerchantVerificationRecord {
  id: string;
  merchant_id: string;
  verification_type: VerificationType;
  status: VerificationStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MerchantBadgeRecord {
  id: string;
  merchant_id: string;
  badge_type: TrustBadge;
  granted_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
  granted_by: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
}

export interface TrustHistoryRecord {
  id: string;
  merchant_id: string;
  snapshot_date: string;
  trust_score: number;
  status: TrustStatus;
  badge_level: TrustBadge | null;
  event_count: number;
  verification_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── Sprint 1.5.2 — Verification Catalog ──────────────────────────────────────

export interface VerificationTypeCatalogRecord {
  id: string;
  label: string;
  description: string;
  category: VerificationCategory;
  requires_evidence: boolean;
  validity_days: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface VerificationEvidenceRecord {
  id: string;
  verification_id: string;
  merchant_id: string;
  evidence_type: EvidenceType;
  label: string;
  content: string | null;
  file_path: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_by: string | null;
  is_valid: boolean | null;
  review_note: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface VerificationAuditRecord {
  id: string;
  verification_id: string;
  merchant_id: string;
  action: VerificationAction;
  previous_status: string | null;
  new_status: string | null;
  performed_by: string | null;
  performed_by_role: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── Sprint 1.5.3 — Trust Signals ─────────────────────────────────────────────

export interface TrustSignalRecord {
  id: string;
  merchant_id: string;
  signal_type: TrustSignalType;
  status: TrustSignalStatus;
  category: TrustSignalCategory;
  title: string;
  description: string;
  evidence_summary: string;
  source: string;
  sort_order: number;
  issued_at: string;
  expires_at: string | null;
  last_updated_at: string;
  is_public: boolean;
  verification_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SignalProvenanceRecord {
  id: string;
  signal_id: string;
  merchant_id: string;
  generated_by: string | null;
  verification_id: string | null;
  evidence_summary: string;
  how_obtained: string;
  approved_by: string | null;
  trust_level: SignalTrustLevel;
  is_auditable: boolean;
  notes: string | null;
  created_at: string;
}

// ── Sprint 1.5.3 — Reviews ───────────────────────────────────────────────────

export interface MerchantReviewRecord {
  id: string;
  merchant_id: string;
  reviewer_id: string;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  is_verified_purchase: boolean;
  purchase_ref: string | null;
  merchant_reply: string | null;
  merchant_reply_at: string | null;
  edited_at: string | null;
  edit_count: number;
  helpful_count: number;
  report_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  deleted_at: string | null;
}

export interface ReviewReportRecord {
  id: string;
  review_id: string;
  merchant_id: string;
  reporter_id: string;
  reason: ReviewReportReason;
  description: string | null;
  status: ReviewReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  action_taken: string | null;
  created_at: string;
}

export interface ReviewAuditRecord {
  id: string;
  review_id: string;
  merchant_id: string;
  action: ReviewAction;
  previous_body: string | null;
  new_body: string | null;
  previous_status: string | null;
  new_status: string | null;
  performed_by: string | null;
  performed_by_role: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── Sprint 1.5.3 — Timeline ──────────────────────────────────────────────────

export interface MerchantTimelineRecord {
  id: string;
  merchant_id: string;
  event_type: TimelineEventType;
  title: string;
  description: string | null;
  category: TimelineEventCategory;
  reference_id: string | null;
  reference_type: string | null;
  visibility: TimelineVisibility;
  occurred_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── Composite Views ───────────────────────────────────────────────────────────

export interface MerchantTrustSummary {
  merchantId: string;
  trustScore: number;
  status: TrustStatus;
  badgeLevel: TrustBadge;
  activeBadge: MerchantBadgeRecord | null;
  verificationCount: number;
  activeSignalCount: number;
  reviewCount: number;
  averageRating: number | null;
  lastVerifiedAt: string | null;
  signals: TrustSignalValue[];
}

export interface TrustSignalValue {
  signal: TrustSignal;
  value: number;
  label: string;
}

export interface MerchantPublicProfile {
  merchantId: string;
  companyName: string;
  trustSummary: MerchantTrustSummary;
  activeSignals: TrustSignalRecord[];
  recentTimeline: MerchantTimelineRecord[];
  recentReviews: MerchantReviewRecord[];
  activeBadges: MerchantBadgeRecord[];
}

export interface ReviewStats {
  total: number;
  average: number | null;
  distribution: Record<number, number>;
  approvedCount: number;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationOptions {
  page?: number;
  perPage?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// ── Epic 3 — Merchant Identity / Passport ────────────────────────────────────

export interface MerchantBasicData {
  companyName: string;
  companyDoc: string | null;
  website: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  verifiedLevel: string;
  plan: string;
  joinedAt: string;
  lastUpdatedAt: string;
}

export interface MerchantChannel {
  type: MerchantChannelType;
  value: string;
  verified: boolean;
}

export interface MerchantInsights {
  platformAgeInDays: number;
  joinedAt: string;
  verificationCount: number;
  activeSignalCount: number;
  reviewCount: number;
  averageRating: number | null;
  lastVerifiedAt: string | null;
  lastProfileUpdateAt: string | null;
  timelineEventCount: number;
}

export interface PassportSearchMetadata {
  hasVerifiedSignals: boolean;
  signalTypes: string[];
  badgeLevel: string;
  verificationCount: number;
  reviewCount: number;
  averageRating: number | null;
}

export interface MerchantPassport {
  merchantId: string;
  basic: MerchantBasicData;
  trustSummary: MerchantTrustSummary;
  activeSignals: TrustSignalRecord[];
  badges: MerchantBadgeRecord[];
  timeline: MerchantTimelineRecord[];
  reviews: MerchantReviewRecord[];
  reviewStats: ReviewStats;
  insights: MerchantInsights;
  channels: MerchantChannel[];
  searchMetadata: PassportSearchMetadata;
  generatedAt: string;
}

// ── Brain Impact ──────────────────────────────────────────────────────────────

export interface BrainImpact {
  asset: string;
  description: string;
}

export interface TrustEventBrainImpact {
  eventType: TrustEventType;
  assets: BrainImpact[];
}
