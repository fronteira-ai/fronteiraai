import type { IMerchantTimelineRepository } from "../repositories/IMerchantTimelineRepository";
import type { MerchantTimelineRecord, PaginatedResult, PaginationOptions } from "../types/trust.types";
import type { TimelineEventCategory, TimelineVisibility } from "../types/enums";

export class MerchantTimelineService {
  constructor(private readonly timelineRepository: IMerchantTimelineRepository) {}

  async getPublicTimeline(merchantId: string, limit = 20): Promise<MerchantTimelineRecord[]> {
    return this.timelineRepository.findPublicByMerchantId(merchantId, limit);
  }

  async getFullTimeline(
    merchantId: string,
    options?: PaginationOptions & { category?: TimelineEventCategory; visibility?: TimelineVisibility }
  ): Promise<PaginatedResult<MerchantTimelineRecord>> {
    return this.timelineRepository.findByMerchantId(merchantId, options);
  }

  async addEvent(input: Omit<MerchantTimelineRecord, "id" | "created_at">): Promise<MerchantTimelineRecord | null> {
    return this.timelineRepository.create(input);
  }
}
