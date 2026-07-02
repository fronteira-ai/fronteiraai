import type { IUpgradeLeadRepository, UpgradeLead } from "../repositories/IUpgradeLeadRepository";
import type { EventService } from "@/src/domains/trust/services/EventService";
import { premiumUpgradeViewedEvent, toCreateEventInput } from "../events/merchant-ownership.events";

// Epic H — Premium Upgrade Journey. Lead-capture only (confirmed with the
// CTO): no payment gateway exists (ADR-035), so "upgrading" here means
// recording interest for an admin to follow up on manually — actual plan
// changes remain a manual admin action.
export class PremiumUpgradeService {
  constructor(
    private readonly leadRepository: IUpgradeLeadRepository,
    private readonly eventService: EventService
  ) {}

  async recordInterest(merchantId: string, triggerContext: string): Promise<UpgradeLead> {
    const lead = await this.leadRepository.create(merchantId, triggerContext);
    await this.eventService.recordEvent(toCreateEventInput(premiumUpgradeViewedEvent(merchantId, triggerContext)));
    return lead;
  }
}
