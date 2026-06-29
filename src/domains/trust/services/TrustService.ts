import type { ITrustRepository } from "../repositories/ITrustRepository";
import type { ITrustEventRepository } from "../repositories/ITrustEventRepository";
import type { MerchantTrustRecord, PaginationOptions, PaginatedResult } from "../types/trust.types";
import { TrustStatus, TrustSource, TrustEventType, TrustBadge } from "../types/enums";

export class TrustService {
  constructor(
    private readonly trustRepository: ITrustRepository,
    private readonly eventRepository: ITrustEventRepository
  ) {}

  async getMerchantTrust(merchantId: string): Promise<MerchantTrustRecord | null> {
    return this.trustRepository.findByMerchantId(merchantId);
  }

  async listAll(options?: PaginationOptions): Promise<PaginatedResult<MerchantTrustRecord>> {
    return this.trustRepository.findAll(options);
  }

  async initializeMerchantTrust(merchantId: string): Promise<MerchantTrustRecord | null> {
    const existing = await this.trustRepository.findByMerchantId(merchantId);
    if (existing) return existing;

    const created = await this.trustRepository.create(merchantId);
    if (!created) return null;

    await this.eventRepository.create({
      merchant_id: merchantId,
      merchant_trust_id: created.id,
      event_type: TrustEventType.TrustUpdated,
      source: TrustSource.System,
      metadata: { action: "initialized" },
    });

    return created;
  }

  async updateTrustStatus(
    merchantId: string,
    status: TrustStatus,
    source: TrustSource,
    adminId?: string
  ): Promise<MerchantTrustRecord | null> {
    const current = await this.trustRepository.findByMerchantId(merchantId);
    if (!current) return null;

    const updated = await this.trustRepository.updateStatus(merchantId, status);
    if (!updated) return null;

    await this.eventRepository.create({
      merchant_id: merchantId,
      merchant_trust_id: current.id,
      event_type: TrustEventType.TrustUpdated,
      source,
      metadata: { previous_status: current.status, new_status: status },
      created_by: adminId,
    });

    return updated;
  }

  async suspendMerchant(merchantId: string, adminId: string): Promise<MerchantTrustRecord | null> {
    return this.updateTrustStatus(merchantId, TrustStatus.Suspended, TrustSource.Admin, adminId);
  }

  async getOrInitialize(merchantId: string): Promise<MerchantTrustRecord | null> {
    const existing = await this.trustRepository.findByMerchantId(merchantId);
    if (existing) return existing;
    return this.initializeMerchantTrust(merchantId);
  }

  async updateBadge(merchantId: string, badgeLevel: TrustBadge): Promise<MerchantTrustRecord | null> {
    return this.trustRepository.updateBadge(merchantId, badgeLevel);
  }
}
