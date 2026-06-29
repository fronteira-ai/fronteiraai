import type { MerchantBadgeRecord } from "../types/trust.types";
import type { TrustBadge } from "../types/enums";

export interface IBadgeRepository {
  findByMerchantId(merchantId: string): Promise<MerchantBadgeRecord[]>;
  findActiveBadge(merchantId: string): Promise<MerchantBadgeRecord | null>;
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
