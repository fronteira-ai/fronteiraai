import type { IBadgeRepository } from "../repositories/IBadgeRepository";
import type { ITrustRepository } from "../repositories/ITrustRepository";
import type { ITrustEventRepository } from "../repositories/ITrustEventRepository";
import type { MerchantBadgeRecord } from "../types/trust.types";
import { TrustBadge, TrustEventType, TrustSource } from "../types/enums";

export class BadgeService {
  constructor(
    private readonly badgeRepository: IBadgeRepository,
    private readonly trustRepository: ITrustRepository,
    private readonly eventRepository: ITrustEventRepository
  ) {}

  async getMerchantBadges(merchantId: string): Promise<MerchantBadgeRecord[]> {
    return this.badgeRepository.findByMerchantId(merchantId);
  }

  async getActiveBadge(merchantId: string): Promise<MerchantBadgeRecord | null> {
    return this.badgeRepository.findActiveBadge(merchantId);
  }

  async grantBadge(
    merchantId: string,
    badgeType: TrustBadge,
    grantedBy: string,
    expiresAt?: string
  ): Promise<MerchantBadgeRecord | null> {
    await this.badgeRepository.deactivateAll(merchantId);

    const badge = await this.badgeRepository.grant(merchantId, badgeType, grantedBy, expiresAt);
    if (!badge) return null;

    await this.trustRepository.updateBadge(merchantId, badgeType);

    await this.eventRepository.create({
      merchant_id: merchantId,
      event_type: TrustEventType.BadgeGranted,
      source: TrustSource.Admin,
      metadata: { badge_type: badgeType, badge_id: badge.id, expires_at: expiresAt ?? null },
      created_by: grantedBy,
    });

    return badge;
  }

  async revokeBadge(
    merchantId: string,
    badgeId: string,
    revokedBy: string,
    reason: string
  ): Promise<MerchantBadgeRecord | null> {
    const revoked = await this.badgeRepository.revoke(badgeId, revokedBy, reason);
    if (!revoked) return null;

    await this.trustRepository.updateBadge(merchantId, TrustBadge.None);

    await this.eventRepository.create({
      merchant_id: merchantId,
      event_type: TrustEventType.BadgeRemoved,
      source: TrustSource.Admin,
      metadata: { badge_id: badgeId, reason },
      created_by: revokedBy,
    });

    return revoked;
  }

  getBadgeLabel(badgeType: TrustBadge): string {
    const labels: Record<TrustBadge, string> = {
      [TrustBadge.None]: "Sem badge",
      [TrustBadge.Basic]: "Loja",
      [TrustBadge.Verified]: "Verificada",
      [TrustBadge.Premium]: "Verificada Premium",
    };
    return labels[badgeType];
  }
}
