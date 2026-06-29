import type { ITrustRepository } from "../repositories/ITrustRepository";
import type { IVerificationRepository } from "../repositories/IVerificationRepository";
import type { IBadgeRepository } from "../repositories/IBadgeRepository";
import type { ITrustSignalRepository } from "../repositories/ITrustSignalRepository";
import type { IMerchantReviewRepository } from "../repositories/IMerchantReviewRepository";
import type { IMerchantTimelineRepository } from "../repositories/IMerchantTimelineRepository";
import type {
  MerchantPassport,
  MerchantBasicData,
  MerchantChannel,
  MerchantInsights,
  PassportSearchMetadata,
  MerchantTrustSummary,
} from "../types/trust.types";
import {
  TrustStatus,
  TrustBadge,
  TrustSignalType,
  VerificationStatus,
  MerchantChannelType,
} from "../types/enums";

export class MerchantPassportService {
  constructor(
    private readonly trustRepository: ITrustRepository,
    private readonly verificationRepository: IVerificationRepository,
    private readonly badgeRepository: IBadgeRepository,
    private readonly signalRepository: ITrustSignalRepository,
    private readonly reviewRepository: IMerchantReviewRepository,
    private readonly timelineRepository: IMerchantTimelineRepository
  ) {}

  async getPassport(merchantId: string, basic: MerchantBasicData): Promise<MerchantPassport | null> {
    try {
      const [trustRecord, verifications, signals, allBadges, timelineItems, reviewsResult, reviewStats] =
        await Promise.all([
          this.trustRepository.findByMerchantId(merchantId),
          this.verificationRepository.findByMerchantId(merchantId),
          this.signalRepository.findActiveByMerchantId(merchantId),
          this.badgeRepository.findByMerchantId(merchantId),
          this.timelineRepository.findPublicByMerchantId(merchantId, 20),
          this.reviewRepository.findByMerchantId(merchantId, { perPage: 10 }),
          this.reviewRepository.getStats(merchantId),
        ]);

      const activeBadges = allBadges.filter((b) => b.is_active);
      const approvedVerifications = verifications.filter(
        (v) => v.status === VerificationStatus.Approved
      );

      const contactSignalActive = signals.some(
        (s) => s.signal_type === TrustSignalType.ContactConfirmed
      );

      const channels: MerchantChannel[] = [
        ...(basic.website
          ? [{ type: MerchantChannelType.Website, value: basic.website, verified: contactSignalActive }]
          : []),
        ...(basic.whatsapp
          ? [{ type: MerchantChannelType.WhatsApp, value: basic.whatsapp, verified: contactSignalActive }]
          : []),
        ...(basic.phone
          ? [{ type: MerchantChannelType.Phone, value: basic.phone, verified: contactSignalActive }]
          : []),
        ...(basic.email
          ? [{ type: MerchantChannelType.Email, value: basic.email, verified: contactSignalActive }]
          : []),
      ];

      const joinedDate = new Date(basic.joinedAt);
      const platformAgeInDays = Math.max(
        0,
        Math.floor((Date.now() - joinedDate.getTime()) / 86400000)
      );

      const insights: MerchantInsights = {
        platformAgeInDays,
        joinedAt: basic.joinedAt,
        verificationCount: approvedVerifications.length,
        activeSignalCount: signals.length,
        reviewCount: reviewStats.total,
        averageRating: reviewStats.average,
        lastVerifiedAt: trustRecord?.last_verified_at ?? null,
        lastProfileUpdateAt: basic.lastUpdatedAt,
        timelineEventCount: timelineItems.length,
      };

      const searchMetadata: PassportSearchMetadata = {
        hasVerifiedSignals: signals.length > 0,
        signalTypes: signals.map((s) => s.signal_type),
        badgeLevel: (trustRecord?.badge_level as string) ?? TrustBadge.None,
        verificationCount: approvedVerifications.length,
        reviewCount: reviewStats.total,
        averageRating: reviewStats.average,
      };

      const trustSummary: MerchantTrustSummary = {
        merchantId,
        trustScore: trustRecord?.trust_score ?? 0,
        status: (trustRecord?.status as TrustStatus) ?? TrustStatus.Unverified,
        badgeLevel: (trustRecord?.badge_level as TrustBadge) ?? TrustBadge.None,
        activeBadge: activeBadges[0] ?? null,
        verificationCount: approvedVerifications.length,
        activeSignalCount: signals.length,
        reviewCount: reviewStats.total,
        averageRating: reviewStats.average,
        lastVerifiedAt: trustRecord?.last_verified_at ?? null,
        signals: [],
      };

      return {
        merchantId,
        basic,
        trustSummary,
        activeSignals: signals,
        badges: activeBadges,
        timeline: timelineItems,
        reviews: reviewsResult.data,
        reviewStats,
        insights,
        channels,
        searchMetadata,
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error("[MerchantPassportService.getPassport]", err);
      return null;
    }
  }

  async getInsights(merchantId: string, joinedAt: string, lastUpdatedAt: string): Promise<MerchantInsights | null> {
    try {
      const [verifications, signals, reviewStats, trustRecord] = await Promise.all([
        this.verificationRepository.findByMerchantId(merchantId),
        this.signalRepository.findActiveByMerchantId(merchantId),
        this.reviewRepository.getStats(merchantId),
        this.trustRepository.findByMerchantId(merchantId),
      ]);

      const approvedVerifications = verifications.filter((v) => v.status === VerificationStatus.Approved);
      const platformAgeInDays = Math.max(
        0,
        Math.floor((Date.now() - new Date(joinedAt).getTime()) / 86400000)
      );

      return {
        platformAgeInDays,
        joinedAt,
        verificationCount: approvedVerifications.length,
        activeSignalCount: signals.length,
        reviewCount: reviewStats.total,
        averageRating: reviewStats.average,
        lastVerifiedAt: trustRecord?.last_verified_at ?? null,
        lastProfileUpdateAt: lastUpdatedAt,
        timelineEventCount: 0,
      };
    } catch (err) {
      console.error("[MerchantPassportService.getInsights]", err);
      return null;
    }
  }
}
