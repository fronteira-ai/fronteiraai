import type { MerchantBadgeRecord } from "../types/trust.types";
import type { TrustBadge } from "../types/enums";

export interface IBadgeRepository {
  findByMerchantId(merchantId: string): Promise<MerchantBadgeRecord[]>;
  findActiveBadge(merchantId: string): Promise<MerchantBadgeRecord | null>;
  /** Batched form of findActiveBadge for callers resolving badges for many
   * merchants in one pass (e.g. buyer-intelligence composers ranking offers
   * from several stores). Merchants with no active badge are simply absent
   * from the returned map. */
  findActiveBadgesByMerchantIds(merchantIds: string[]): Promise<Map<string, MerchantBadgeRecord>>;
  grant(
    merchantId: string,
    badgeType: TrustBadge,
    grantedBy: string,
    expiresAt?: string
  ): Promise<MerchantBadgeRecord | null>;
  revoke(
    id: string,
    revokedBy: string,
    reason: string
  ): Promise<MerchantBadgeRecord | null>;
  deactivateAll(merchantId: string): Promise<void>;
}
