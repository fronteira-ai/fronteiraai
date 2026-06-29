import type { IVerificationHistoryRepository } from "../repositories/IVerificationHistoryRepository";
import type { IVerificationRepository } from "../repositories/IVerificationRepository";
import type { VerificationAuditRecord, MerchantVerificationRecord } from "../types/trust.types";

export interface VerificationTimeline {
  verification: MerchantVerificationRecord;
  history: VerificationAuditRecord[];
}

export class VerificationHistoryService {
  constructor(
    private readonly historyRepository: IVerificationHistoryRepository,
    private readonly verificationRepository: IVerificationRepository
  ) {}

  async getVerificationHistory(verificationId: string): Promise<VerificationAuditRecord[]> {
    return this.historyRepository.findByVerificationId(verificationId);
  }

  async getMerchantAuditLog(merchantId: string, limit = 100): Promise<VerificationAuditRecord[]> {
    return this.historyRepository.findByMerchantId(merchantId, limit);
  }

  async getMerchantTimeline(merchantId: string): Promise<VerificationTimeline[]> {
    const verifications = await this.verificationRepository.findByMerchantId(merchantId);

    const timelines = await Promise.all(
      verifications.map(async (v) => ({
        verification: v,
        history: await this.historyRepository.findByVerificationId(v.id),
      }))
    );

    return timelines;
  }

  countByAction(history: VerificationAuditRecord[]): Record<string, number> {
    return history.reduce<Record<string, number>>((acc, h) => {
      acc[h.action] = (acc[h.action] ?? 0) + 1;
      return acc;
    }, {});
  }
}
