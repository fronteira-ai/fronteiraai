import type { ITrustEventRepository, CreateTrustEventInput } from "../repositories/ITrustEventRepository";
import type { TrustEventRecord } from "../types/trust.types";
import { TrustEventType, TrustSource, BrainAsset } from "../types/enums";
import { TRUST_EVENT_BRAIN_IMPACT } from "../events/event-registry";

export class EventService {
  constructor(private readonly eventRepository: ITrustEventRepository) {}

  async recordEvent(input: CreateTrustEventInput): Promise<TrustEventRecord | null> {
    return this.eventRepository.create(input);
  }

  async getMerchantEvents(merchantId: string, limit = 50): Promise<TrustEventRecord[]> {
    return this.eventRepository.findByMerchantId(merchantId, limit);
  }

  async recordMerchantViewed(
    merchantId: string,
    metadata?: Record<string, unknown>
  ): Promise<TrustEventRecord | null> {
    return this.eventRepository.create({
      merchant_id: merchantId,
      event_type: TrustEventType.MerchantViewed,
      source: TrustSource.Buyer,
      metadata: metadata ?? {},
    });
  }

  async recordMerchantVerified(
    merchantId: string,
    adminId: string
  ): Promise<TrustEventRecord | null> {
    return this.eventRepository.create({
      merchant_id: merchantId,
      event_type: TrustEventType.MerchantVerified,
      source: TrustSource.Admin,
      metadata: {},
      created_by: adminId,
    });
  }

  async recordReviewCreated(
    merchantId: string,
    reviewId: string
  ): Promise<TrustEventRecord | null> {
    return this.eventRepository.create({
      merchant_id: merchantId,
      event_type: TrustEventType.ReviewCreated,
      source: TrustSource.Buyer,
      metadata: { review_id: reviewId },
    });
  }

  async recordReviewModerated(
    merchantId: string,
    reviewId: string,
    approved: boolean,
    adminId: string
  ): Promise<TrustEventRecord | null> {
    return this.eventRepository.create({
      merchant_id: merchantId,
      event_type: TrustEventType.ReviewModerated,
      source: TrustSource.Admin,
      metadata: { review_id: reviewId, approved },
      created_by: adminId,
    });
  }

  getBrainAssetsForEvent(eventType: TrustEventType): BrainAsset[] {
    const impact = TRUST_EVENT_BRAIN_IMPACT.find((e) => e.eventType === eventType);
    return impact ? impact.assets.map((a) => a.asset as BrainAsset) : [];
  }
}
