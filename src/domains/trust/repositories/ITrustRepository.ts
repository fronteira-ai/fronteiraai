import type { MerchantTrustRecord, PaginationOptions, PaginatedResult } from "../types/trust.types";
import type { TrustStatus, TrustBadge } from "../types/enums";

export interface ITrustRepository {
  findByMerchantId(merchantId: string): Promise<MerchantTrustRecord | null>;
  findAll(options?: PaginationOptions): Promise<PaginatedResult<MerchantTrustRecord>>;
  create(merchantId: string): Promise<MerchantTrustRecord | null>;
  updateStatus(merchantId: string, status: TrustStatus): Promise<MerchantTrustRecord | null>;
  updateBadge(merchantId: string, badgeLevel: TrustBadge): Promise<MerchantTrustRecord | null>;
  touch(merchantId: string): Promise<void>;
}
