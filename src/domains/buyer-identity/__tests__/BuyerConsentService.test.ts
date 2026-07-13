import { BuyerConsentService } from "../services/BuyerConsentService";
import type { IBuyerConsentRepository, BuyerConsentRecord } from "../repositories/IBuyerConsentRepository";

function makeRecord(overrides: Partial<BuyerConsentRecord> = {}): BuyerConsentRecord {
  return {
    id: "consent-1",
    buyerId: "buyer-1",
    consentType: "marketing",
    granted: true,
    metadata: {},
    recordedAt: "2026-07-13T00:00:00Z",
    ...overrides,
  };
}

function makeRepo(overrides: Partial<IBuyerConsentRepository> = {}): IBuyerConsentRepository {
  return {
    record: jest.fn().mockResolvedValue(null),
    findByBuyerId: jest.fn().mockResolvedValue([]),
    findCurrentByBuyerId: jest.fn().mockResolvedValue(new Map()),
    ...overrides,
  };
}

describe("BuyerConsentService", () => {
  it("grant() records a new granted=true row, never mutates a past one", async () => {
    const repo = makeRepo({ record: jest.fn().mockResolvedValue(makeRecord()) });
    const service = new BuyerConsentService(repo);

    await service.grant("buyer-1", "marketing", { source: "checkout" });
    expect(repo.record).toHaveBeenCalledWith({
      buyerId: "buyer-1",
      consentType: "marketing",
      granted: true,
      metadata: { source: "checkout" },
    });
  });

  it("revoke() records a new granted=false row (append, not update)", async () => {
    const repo = makeRepo({ record: jest.fn().mockResolvedValue(makeRecord({ granted: false })) });
    const service = new BuyerConsentService(repo);

    await service.revoke("buyer-1", "marketing");
    expect(repo.record).toHaveBeenCalledWith({
      buyerId: "buyer-1",
      consentType: "marketing",
      granted: false,
      metadata: undefined,
    });
  });

  it("hasCurrentConsent reflects the most recent record per consent type", async () => {
    const repo = makeRepo({
      findCurrentByBuyerId: jest.fn().mockResolvedValue(new Map([["marketing", makeRecord({ granted: true })]])),
    });
    const service = new BuyerConsentService(repo);

    expect(await service.hasCurrentConsent("buyer-1", "marketing")).toBe(true);
    expect(await service.hasCurrentConsent("buyer-1", "analytics")).toBe(false);
  });
});
