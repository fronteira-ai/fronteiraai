import type { VerificationType, TrustBadge, TrustStatus, TrustSource, TrustEventType, TrustReason } from "../../types/enums";

// ── Input DTOs (API → Application) ───────────────────────────────────────────

export interface SubmitVerificationInput {
  merchantId: string;
  verificationType: VerificationType;
  metadata?: Record<string, unknown>;
}

export interface GrantBadgeInput {
  merchantId: string;
  badgeType: TrustBadge;
  grantedBy: string;
  expiresAt?: string;
}

export interface RevokeBadgeInput {
  merchantId: string;
  badgeId: string;
  revokedBy: string;
  reason: string;
}

export interface UpdateTrustStatusInput {
  merchantId: string;
  status: TrustStatus;
  source: TrustSource;
  adminId?: string;
}

export interface RecordEventInput {
  merchantId: string;
  eventType: TrustEventType;
  source: TrustSource;
  reason?: TrustReason;
  delta?: number;
  metadata?: Record<string, unknown>;
  createdBy?: string;
}

// ── Output DTOs (Application → API) ──────────────────────────────────────────

export interface TrustStatusResponse {
  merchantId: string;
  status: TrustStatus;
  badgeLevel: TrustBadge;
  lastVerifiedAt: string | null;
  badge: {
    type: TrustBadge;
    label: string;
    grantedAt: string;
    expiresAt: string | null;
  } | null;
}

export interface TrustHistoryResponse {
  merchantId: string;
  snapshots: Array<{
    date: string;
    score: number;
    status: TrustStatus;
    badgeLevel: TrustBadge | null;
  }>;
}

export interface BadgeListResponse {
  merchantId: string;
  activeBadge: {
    type: TrustBadge;
    label: string;
    grantedAt: string;
    expiresAt: string | null;
  } | null;
  history: Array<{
    type: TrustBadge;
    grantedAt: string;
    revokedAt: string | null;
    isActive: boolean;
  }>;
}
