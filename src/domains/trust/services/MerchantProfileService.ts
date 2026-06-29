import type { ITrustRepository } from "../repositories/ITrustRepository";
import type { IBadgeRepository } from "../repositories/IBadgeRepository";
import type { ITrustSignalRepository } from "../repositories/ITrustSignalRepository";
import type { IMerchantReviewRepository } from "../repositories/IMerchantReviewRepository";
import type { IMerchantTimelineRepository } from "../repositories/IMerchantTimelineRepository";
import type { MerchantPublicProfile, MerchantTrustSummary } from "../types/trust.types";
import { TrustStatus, TrustBadge } from "../types/enums";

export class MerchantProfileService {
  constructor(
    private readonly trustRepository: ITrustRepository,
    private readonly badgeRepository: IBadgeRepository,
    private readonly signalRepository: ITrustSignalRepository,
    private readonly reviewRepository: IMerchantReviewRepository,
    private readonly timelineRepository: IMerchantTimelineRepository
  ) {}

  async getPublicProfile(merchantId: string): Promise<MerchantPublicProfile | null> {
    const [trustRecord, signals, timelineResult, reviewsResult, allBadges] = await Promise.all([
      this.trustRepository.findByMerchantId(merchantId),
      this.signalRepository.findActiveByMerchantId(merchantId),
      this.timelineRepository.findPublicByMerchantId(merchantId, 10),
      this.reviewRepository.findByMerchantId(merchantId, { perPage: 5, status: undefined }),
      this.badgeRepository.findByMerchantId(merchantId),
    ]);

    const stats = await this.reviewRepository.getStats(merchantId);
    const activeBadges = allBadges.filter((b) => b.is_active);

    const trustSummary: MerchantTrustSummary = {
      merchantId,
      trustScore: trustRecord?.trust_score ?? 0,
      status: (trustRecord?.status as TrustStatus) ?? TrustStatus.Unverified,
      badgeLevel: (trustRecord?.badge_level as TrustBadge) ?? TrustBadge.None,
      activeBadge: activeBadges[0] ?? null,
      verificationCount: 0,
      activeSignalCount: signals.length,
      reviewCount: stats.total,
      averageRating: stats.average,
      lastVerifiedAt: trustRecord?.last_verified_at ?? null,
      signals: [],
    };

    return {
      merchantId,
      companyName: "",
      trustSummary,
      activeSignals: signals,
      recentTimeline: timelineResult,
      recentReviews: reviewsResult.data,
      activeBadges,
    };
  }

  async getTrustSummary(merchantId: string): Promise<MerchantTrustSummary | null> {
    const profile = await this.getPublicProfile(merchantId);
    return profile?.trustSummary ?? null;
  }
}
