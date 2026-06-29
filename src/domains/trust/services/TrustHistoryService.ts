import type { ITrustHistoryRepository } from "../repositories/ITrustHistoryRepository";
import type { ITrustRepository } from "../repositories/ITrustRepository";
import type { ITrustEventRepository } from "../repositories/ITrustEventRepository";
import type { IVerificationRepository } from "../repositories/IVerificationRepository";
import type { TrustHistoryRecord } from "../types/trust.types";

export class TrustHistoryService {
  constructor(
    private readonly historyRepository: ITrustHistoryRepository,
    private readonly trustRepository: ITrustRepository,
    private readonly eventRepository: ITrustEventRepository,
    private readonly verificationRepository: IVerificationRepository
  ) {}

  async getMerchantHistory(merchantId: string, limit = 30): Promise<TrustHistoryRecord[]> {
    return this.historyRepository.findByMerchantId(merchantId, limit);
  }

  async getLatestSnapshot(merchantId: string): Promise<TrustHistoryRecord | null> {
    return this.historyRepository.findLatest(merchantId);
  }

  async createDailySnapshot(merchantId: string): Promise<TrustHistoryRecord | null> {
    const trust = await this.trustRepository.findByMerchantId(merchantId);
    if (!trust) return null;

    const events = await this.eventRepository.findByMerchantId(merchantId, 1000);
    const verifications = await this.verificationRepository.findByMerchantId(merchantId);

    return this.historyRepository.createSnapshot(
      merchantId,
      trust.trust_score,
      trust.status,
      trust.badge_level,
      events.length,
      verifications.length
    );
  }
}
