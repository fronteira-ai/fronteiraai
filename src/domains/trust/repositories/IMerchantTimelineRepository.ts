import type { MerchantTimelineRecord, PaginatedResult, PaginationOptions } from "../types/trust.types";
import type { TimelineEventCategory, TimelineVisibility } from "../types/enums";

export interface IMerchantTimelineRepository {
  findByMerchantId(merchantId: string, options?: PaginationOptions & {
    category?: TimelineEventCategory;
    visibility?: TimelineVisibility;
  }): Promise<PaginatedResult<MerchantTimelineRecord>>;
  findPublicByMerchantId(merchantId: string, limit?: number): Promise<MerchantTimelineRecord[]>;
  create(input: Omit<MerchantTimelineRecord, "id" | "created_at">): Promise<MerchantTimelineRecord | null>;
}
