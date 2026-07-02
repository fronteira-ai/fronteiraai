import { PremiumUpgradeService } from "../services/PremiumUpgradeService";
import type { IUpgradeLeadRepository } from "../repositories/IUpgradeLeadRepository";
import type { EventService } from "@/src/domains/trust/services/EventService";

describe("PremiumUpgradeService", () => {
  it("records a lead and emits PremiumUpgradeViewed — never touches merchant.plan (ADR-035, lead-capture only)", async () => {
    const create = jest.fn().mockResolvedValue({ id: "lead-1", merchantId: "merchant-1", triggerContext: "growth_center", createdAt: "2026-07-01T00:00:00Z" });
    const leadRepo: IUpgradeLeadRepository = { create, findByMerchantId: jest.fn() };
    const recordEvent = jest.fn().mockResolvedValue(undefined);
    const eventService = { recordEvent } as unknown as EventService;

    const service = new PremiumUpgradeService(leadRepo, eventService);
    const lead = await service.recordInterest("merchant-1", "growth_center");

    expect(create).toHaveBeenCalledWith("merchant-1", "growth_center");
    expect(recordEvent).toHaveBeenCalledTimes(1);
    expect(lead.id).toBe("lead-1");
  });
});
