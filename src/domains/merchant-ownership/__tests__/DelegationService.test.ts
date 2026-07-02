import { DelegationService } from "../services/DelegationService";
import { DelegateRole, DelegateStatus } from "../types/enums";
import type { MerchantDelegate } from "../domain/MerchantDelegate";
import type { IMerchantDelegateRepository } from "../repositories/IMerchantDelegateRepository";
import type { EventService } from "@/src/domains/trust/services/EventService";

function makeDelegate(overrides: Partial<MerchantDelegate> = {}): MerchantDelegate {
  return {
    id: "delegate-1",
    merchantId: "merchant-1",
    invitedEmail: "gerente@lojaacme.com",
    userId: null,
    role: DelegateRole.Manager,
    status: DelegateStatus.Invited,
    inviteToken: "token-1",
    invitedBy: "owner-user-1",
    invitedAt: "2026-07-01T00:00:00Z",
    acceptedAt: null,
    revokedAt: null,
    ...overrides,
  };
}

function makeRepo(overrides: Partial<IMerchantDelegateRepository> = {}): IMerchantDelegateRepository {
  return {
    create: jest.fn().mockResolvedValue(makeDelegate()),
    findById: jest.fn().mockResolvedValue(makeDelegate()),
    findByToken: jest.fn().mockResolvedValue(makeDelegate()),
    findByMerchantId: jest.fn(),
    findActiveByUserId: jest.fn(),
    accept: jest.fn().mockResolvedValue(undefined),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeEventService(): EventService {
  return { recordEvent: jest.fn().mockResolvedValue(undefined) } as unknown as EventService;
}

describe("DelegationService", () => {
  it("lets the owner invite a delegate", async () => {
    const repo = makeRepo();
    const eventService = makeEventService();
    const service = new DelegationService(repo, eventService);

    const delegate = await service.invite("merchant-1", "owner", "gerente@lojaacme.com", DelegateRole.Manager, "owner-user-1");

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ merchantId: "merchant-1", invitedEmail: "gerente@lojaacme.com", role: DelegateRole.Manager })
    );
    expect(eventService.recordEvent).toHaveBeenCalled();
    expect(delegate.id).toBe("delegate-1");
  });

  it("never lets a delegate (non-owner) invite another delegate", async () => {
    const repo = makeRepo();
    const service = new DelegationService(repo, makeEventService());

    await expect(
      service.invite("merchant-1", DelegateRole.Manager, "outro@lojaacme.com", DelegateRole.Operator, "delegate-user-1")
    ).rejects.toThrow(/apenas o proprietário/i);

    expect(repo.create).not.toHaveBeenCalled();
  });

  it("never lets a delegate (non-owner) revoke another delegate", async () => {
    const repo = makeRepo();
    const service = new DelegationService(repo, makeEventService());

    await expect(service.revoke("delegate-2", "merchant-1", DelegateRole.Operator)).rejects.toThrow(/apenas o proprietário/i);
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it("owner can revoke a delegate belonging to their own merchant", async () => {
    const repo = makeRepo();
    const service = new DelegationService(repo, makeEventService());

    const revoked = await service.revoke("delegate-1", "merchant-1", "owner");

    expect(revoked).toBe(true);
    expect(repo.updateStatus).toHaveBeenCalledWith("delegate-1", DelegateStatus.Revoked);
  });

  it("owner cannot revoke a delegate belonging to a different merchant", async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(makeDelegate({ merchantId: "someone-elses-merchant" })) });
    const service = new DelegationService(repo, makeEventService());

    const revoked = await service.revoke("delegate-1", "merchant-1", "owner");

    expect(revoked).toBe(false);
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it("accepting a valid invite activates the delegate and records the acceptance event", async () => {
    const repo = makeRepo();
    const eventService = makeEventService();
    const service = new DelegationService(repo, eventService);

    const delegate = await service.accept("token-1", "new-user-id");

    expect(repo.accept).toHaveBeenCalledWith("delegate-1", "new-user-id");
    expect(eventService.recordEvent).toHaveBeenCalled();
    expect(delegate).not.toBeNull();
  });

  it("rejects accepting an already-used or unknown invite token", async () => {
    const repo = makeRepo({ findByToken: jest.fn().mockResolvedValue(null) });
    const service = new DelegationService(repo, makeEventService());

    const result = await service.accept("bad-token", "new-user-id");

    expect(result).toBeNull();
    expect(repo.accept).not.toHaveBeenCalled();
  });

  it("getPermissions returns the fixed permission set for a role", () => {
    const service = new DelegationService(makeRepo(), makeEventService());
    const operatorPermissions = service.getPermissions(DelegateRole.Operator);
    const adminPermissions = service.getPermissions(DelegateRole.Administrator);

    expect(operatorPermissions.length).toBeLessThan(adminPermissions.length);
  });
});
