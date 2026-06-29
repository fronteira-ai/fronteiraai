import { MerchantTrust } from "../domain/MerchantTrust";
import { TrustEvent } from "../domain/TrustEvent";
import { Verification } from "../domain/Verification";
import { Badge } from "../domain/Badge";
import { TrustHistory } from "../domain/TrustHistory";
import type {
  MerchantTrustRecord,
  TrustEventRecord,
  MerchantVerificationRecord,
  MerchantBadgeRecord,
  TrustHistoryRecord,
  MerchantTrustSummary,
} from "../types/trust.types";
import { TrustBadge } from "../types/enums";

const BADGE_LABELS: Record<TrustBadge, string> = {
  [TrustBadge.None]: "Sem badge",
  [TrustBadge.Basic]: "Loja",
  [TrustBadge.Verified]: "Verificada",
  [TrustBadge.Premium]: "Verificada Premium",
};

// ── Record → Domain entity ────────────────────────────────────────────────────

export function toMerchantTrust(record: MerchantTrustRecord): MerchantTrust {
  return MerchantTrust.fromRecord(record);
}

export function toTrustEvent(record: TrustEventRecord): TrustEvent {
  return TrustEvent.fromRecord(record);
}

export function toVerification(record: MerchantVerificationRecord): Verification {
  return Verification.fromRecord(record);
}

export function toBadge(record: MerchantBadgeRecord): Badge {
  return Badge.fromRecord(record);
}

export function toTrustHistory(record: TrustHistoryRecord): TrustHistory {
  return TrustHistory.fromRecord(record);
}

// ── Record → API response ─────────────────────────────────────────────────────

export function toPublicTrustResponse(
  trust: MerchantTrustRecord,
  activeBadge: MerchantBadgeRecord | null
) {
  return {
    merchantId: trust.merchant_id,
    status: trust.status,
    badgeLevel: trust.badge_level,
    lastVerifiedAt: trust.last_verified_at,
    badge: activeBadge
      ? {
          type: activeBadge.badge_type,
          label: BADGE_LABELS[activeBadge.badge_type as TrustBadge] ?? activeBadge.badge_type,
          grantedAt: activeBadge.granted_at,
          expiresAt: activeBadge.expires_at,
        }
      : null,
  };
}

// ── Records → MerchantTrustSummary ───────────────────────────────────────────

export function toTrustSummary(
  trust: MerchantTrustRecord,
  activeBadge: MerchantBadgeRecord | null,
  verificationCount: number
): MerchantTrustSummary {
  return {
    merchantId: trust.merchant_id,
    trustScore: trust.trust_score,
    status: trust.status,
    badgeLevel: trust.badge_level as TrustBadge,
    activeBadge,
    verificationCount,
    activeSignalCount: 0,
    reviewCount: 0,
    averageRating: null,
    lastVerifiedAt: trust.last_verified_at,
    signals: [],
  };
}

// ── Domain entity → Record ────────────────────────────────────────────────────

export function trustToRecord(trust: MerchantTrust): MerchantTrustRecord {
  return trust.toRecord();
}

export function verificationToRecord(v: Verification): MerchantVerificationRecord {
  return v.toRecord();
}

export function badgeToRecord(b: Badge): MerchantBadgeRecord {
  return b.toRecord();
}
