import { CognitiveBrainService } from "../brain/CognitiveBrainService";
import { merchantViewedEvent } from "../events/trust.events";
import { BrainEntityType, CognitiveBrainActorRole } from "../types/enums";
import type { ITrustEventRepository } from "../repositories/ITrustEventRepository";
import type { TrustEventRecord } from "../types/trust.types";

function makeRepo(): jest.Mocked<ITrustEventRepository> {
  return {
    create: jest.fn().mockResolvedValue({ id: "rec-1" } as TrustEventRecord),
    findByMerchantId: jest.fn().mockResolvedValue([]),
    findByType: jest.fn().mockResolvedValue([]),
  };
}

// Release 1.8, Program 0 Wave 0: CognitiveBrainService.ingest() was never
// called by any production code before this Wave (only by tests using a
// staff-shaped actor_id). The first real caller — BuyerEventBrainBridgeService
// — surfaced a real bug: created_by is an FK to profiles(id), and a buyer's
// pseudonymous actor_id is never a profiles row, so every buyer-sourced
// event was violating that FK and silently failing to persist. These tests
// exist to make sure that regression can't come back unnoticed, since it
// went undetected in this exact code for the entire time it existed.
describe("CognitiveBrainService — created_by FK safety for buyer actors", () => {
  it("does NOT forward actor_id to created_by when actor_role is Buyer (would violate the profiles FK)", async () => {
    const repo = makeRepo();
    const service = new CognitiveBrainService(repo);

    await service.ingest(merchantViewedEvent("merchant-1"), {
      entity_type: BrainEntityType.Merchant,
      entity_id: "merchant-1",
      actor_id: "anon-pseudonym-123",
      actor_role: CognitiveBrainActorRole.Buyer,
      source_service: "test",
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: undefined })
    );
  });

  it("DOES forward actor_id to created_by for non-buyer actors (they have real profiles rows)", async () => {
    const repo = makeRepo();
    const service = new CognitiveBrainService(repo);

    await service.ingest(merchantViewedEvent("merchant-1"), {
      entity_type: BrainEntityType.Merchant,
      entity_id: "merchant-1",
      actor_id: "profile-admin-1",
      actor_role: CognitiveBrainActorRole.Admin,
      source_service: "test",
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: "profile-admin-1" })
    );
  });

  it("reports success and persisted:true when the repository succeeds", async () => {
    const repo = makeRepo();
    const service = new CognitiveBrainService(repo);

    const result = await service.ingest(merchantViewedEvent("merchant-1"), {
      entity_type: BrainEntityType.Merchant,
      entity_id: "merchant-1",
      actor_id: "anon-pseudonym-123",
      actor_role: CognitiveBrainActorRole.Buyer,
      source_service: "test",
    });

    expect(result.success).toBe(true);
    expect(result.persisted).toBe(true);
  });

  it("reports persisted:false without throwing when the repository rejects (e.g. a real FK violation)", async () => {
    const repo = makeRepo();
    repo.create.mockRejectedValue(new Error("FK violation"));
    const service = new CognitiveBrainService(repo);

    const result = await service.ingest(merchantViewedEvent("merchant-1"), {
      entity_type: BrainEntityType.Merchant,
      entity_id: "merchant-1",
      actor_id: "anon-pseudonym-123",
      actor_role: CognitiveBrainActorRole.Buyer,
      source_service: "test",
    });

    expect(result.success).toBe(true);
    expect(result.persisted).toBe(false);
  });
});
