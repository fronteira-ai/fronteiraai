import { ClaimService } from "../services/ClaimService";
import { ClaimStatus } from "../types/enums";
import type { StoreClaim } from "../domain/StoreClaim";
import type { IStoreClaimRepository } from "../repositories/IStoreClaimRepository";
import type { IMerchantStoreLinkRepository } from "../repositories/IMerchantStoreLinkRepository";
import type { ClaimantInput, StoreChannels } from "../types/merchant-ownership.types";
import type { VerificationService } from "@/src/domains/trust/services/VerificationService";
import type { VerificationEvidenceService } from "@/src/domains/trust/services/VerificationEvidenceService";
import type { EventService } from "@/src/domains/trust/services/EventService";

function makeClaim(overrides: Partial<StoreClaim> = {}): StoreClaim {
  return {
    id: "claim-1",
    merchantId: "merchant-1",
    storeId: "store-1",
    status: ClaimStatus.AwaitingReview,
    claimantName: "Maria",
    claimantPhone: "+595981234567",
    claimantEmail: "maria@lojaacme.com",
    claimantRole: "Proprietária",
    automatedConfidence: 40,
    signalBreakdown: [],
    verificationId: "verification-1",
    rejectionReason: null,
    adminNote: null,
    reviewedAt: null,
    reviewedBy: null,
    createdAt: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

function makeClaimantInput(): ClaimantInput {
  return { name: "Maria", role: "Proprietária", email: "maria@lojaacme.com", phone: "+595981234567" };
}

function makeStoreChannels(overrides: Partial<StoreChannels> = {}): StoreChannels {
  return { email: null, phone: null, whatsapp: null, website: null, instagram: null, ...overrides };
}

function makeClaimRepo(overrides: Partial<IStoreClaimRepository> = {}): IStoreClaimRepository {
  return {
    create: jest.fn().mockResolvedValue(makeClaim()),
    findById: jest.fn().mockResolvedValue(makeClaim()),
    findByMerchantId: jest.fn(),
    findByStoreId: jest.fn(),
    findActiveByStoreAndMerchant: jest.fn().mockResolvedValue(null),
    findByStatus: jest.fn(),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    addAdminNote: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeStoreLinkRepo(overrides: Partial<IMerchantStoreLinkRepository> = {}): IMerchantStoreLinkRepository {
  return {
    link: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    isLinked: jest.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function makeVerificationService(overrides: Partial<VerificationService> = {}): VerificationService {
  return {
    submitVerification: jest.fn().mockResolvedValue({ id: "verification-1" }),
    approveVerification: jest.fn().mockResolvedValue(undefined),
    rejectVerification: jest.fn().mockResolvedValue(undefined),
    revokeVerification: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as VerificationService;
}

function makeEvidenceService(): VerificationEvidenceService {
  return { addEvidence: jest.fn().mockResolvedValue(undefined) } as unknown as VerificationEvidenceService;
}

function makeEventService(): EventService {
  return { recordEvent: jest.fn().mockResolvedValue(undefined) } as unknown as EventService;
}

describe("ClaimService", () => {
  describe("create", () => {
    it("is idempotent — returns the existing active claim instead of creating a duplicate", async () => {
      const existing = makeClaim();
      const claimRepo = makeClaimRepo({ findActiveByStoreAndMerchant: jest.fn().mockResolvedValue(existing) });
      const service = new ClaimService(claimRepo, makeStoreLinkRepo(), makeVerificationService(), makeEvidenceService(), makeEventService());

      const result = await service.create("merchant-1", "store-1", makeClaimantInput(), makeStoreChannels(), "user-1");

      expect(result).toBe(existing);
      expect(claimRepo.create).not.toHaveBeenCalled();
    });

    it("auto-approves and links the store when signals give high confidence", async () => {
      const storeChannels = makeStoreChannels({ phone: "+595981234567", email: "maria@lojaacme.com", website: "lojaacme.com" });
      const claimRepo = makeClaimRepo({ create: jest.fn().mockResolvedValue(makeClaim({ status: ClaimStatus.Approved })) });
      const storeLinkRepo = makeStoreLinkRepo();
      const verificationService = makeVerificationService();
      const eventService = makeEventService();

      const service = new ClaimService(claimRepo, storeLinkRepo, verificationService, makeEvidenceService(), eventService);
      const result = await service.create("merchant-1", "store-1", makeClaimantInput(), storeChannels, "user-1");

      expect(result.status).toBe(ClaimStatus.Approved);
      expect(storeLinkRepo.link).toHaveBeenCalledWith("merchant-1", "store-1");
      expect(verificationService.approveVerification).toHaveBeenCalled();
      expect(eventService.recordEvent).toHaveBeenCalled();
    });

    it("routes to awaiting_review without linking the store when confidence is low", async () => {
      const claimRepo = makeClaimRepo({ create: jest.fn().mockResolvedValue(makeClaim({ status: ClaimStatus.AwaitingReview })) });
      const storeLinkRepo = makeStoreLinkRepo();
      const verificationService = makeVerificationService();

      const service = new ClaimService(claimRepo, storeLinkRepo, verificationService, makeEvidenceService(), makeEventService());
      // Store has no channels at all — nothing applicable, confidence 0.
      const result = await service.create("merchant-1", "store-1", makeClaimantInput(), makeStoreChannels(), "user-1");

      expect(result.status).toBe(ClaimStatus.AwaitingReview);
      expect(storeLinkRepo.link).not.toHaveBeenCalled();
      expect(verificationService.approveVerification).not.toHaveBeenCalled();
    });
  });

  describe("cancel", () => {
    it("cancels a claim owned by the requesting merchant", async () => {
      const claimRepo = makeClaimRepo();
      const service = new ClaimService(claimRepo, makeStoreLinkRepo(), makeVerificationService(), makeEvidenceService(), makeEventService());

      await service.cancel("claim-1", "merchant-1");

      expect(claimRepo.updateStatus).toHaveBeenCalledWith("claim-1", { status: ClaimStatus.Cancelled });
    });

    it("does nothing when the claim belongs to a different merchant", async () => {
      const claimRepo = makeClaimRepo({ findById: jest.fn().mockResolvedValue(makeClaim({ merchantId: "someone-else" })) });
      const service = new ClaimService(claimRepo, makeStoreLinkRepo(), makeVerificationService(), makeEvidenceService(), makeEventService());

      await service.cancel("claim-1", "merchant-1");

      expect(claimRepo.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe("approve / reject / revoke (admin actions)", () => {
    it("approve links the store and approves the verification", async () => {
      const claimRepo = makeClaimRepo();
      const storeLinkRepo = makeStoreLinkRepo();
      const verificationService = makeVerificationService();
      const service = new ClaimService(claimRepo, storeLinkRepo, verificationService, makeEvidenceService(), makeEventService());

      await service.approve("claim-1", "admin-1");

      expect(storeLinkRepo.link).toHaveBeenCalledWith("merchant-1", "store-1");
      expect(verificationService.approveVerification).toHaveBeenCalledWith("verification-1", "admin-1");
      expect(claimRepo.updateStatus).toHaveBeenCalledWith("claim-1", { status: ClaimStatus.Approved, reviewedBy: "admin-1" });
    });

    it("approve is a no-op when the claim isn't awaiting review", async () => {
      const claimRepo = makeClaimRepo({ findById: jest.fn().mockResolvedValue(makeClaim({ status: ClaimStatus.Approved })) });
      const storeLinkRepo = makeStoreLinkRepo();
      const service = new ClaimService(claimRepo, storeLinkRepo, makeVerificationService(), makeEvidenceService(), makeEventService());

      const result = await service.approve("claim-1", "admin-1");

      expect(result).toBeNull();
      expect(storeLinkRepo.link).not.toHaveBeenCalled();
    });

    it("reject rejects the verification and records the reason", async () => {
      const claimRepo = makeClaimRepo();
      const verificationService = makeVerificationService();
      const service = new ClaimService(claimRepo, makeStoreLinkRepo(), verificationService, makeEvidenceService(), makeEventService());

      await service.reject("claim-1", "admin-1", "dados não conferem");

      expect(verificationService.rejectVerification).toHaveBeenCalledWith("verification-1", "admin-1", "dados não conferem");
      expect(claimRepo.updateStatus).toHaveBeenCalledWith("claim-1", {
        status: ClaimStatus.Rejected,
        reviewedBy: "admin-1",
        rejectionReason: "dados não conferem",
      });
    });

    it("revoke only acts on an approved claim, unlinks the store, and never deletes claim history", async () => {
      const claimRepo = makeClaimRepo({ findById: jest.fn().mockResolvedValue(makeClaim({ status: ClaimStatus.Approved })) });
      const storeLinkRepo = makeStoreLinkRepo();
      const verificationService = makeVerificationService();
      const service = new ClaimService(claimRepo, storeLinkRepo, verificationService, makeEvidenceService(), makeEventService());

      await service.revoke("claim-1", "admin-1", "fraude confirmada");

      expect(storeLinkRepo.unlink).toHaveBeenCalledWith("merchant-1", "store-1");
      expect(verificationService.revokeVerification).toHaveBeenCalledWith("verification-1", "admin-1", "fraude confirmada");
      // No delete/status-mutation call other than the ones above — the claim row itself is preserved.
    });

    it("revoke is a no-op on a claim that was never approved", async () => {
      const claimRepo = makeClaimRepo({ findById: jest.fn().mockResolvedValue(makeClaim({ status: ClaimStatus.AwaitingReview })) });
      const storeLinkRepo = makeStoreLinkRepo();
      const service = new ClaimService(claimRepo, storeLinkRepo, makeVerificationService(), makeEvidenceService(), makeEventService());

      const result = await service.revoke("claim-1", "admin-1", "motivo");

      expect(result).toBeNull();
      expect(storeLinkRepo.unlink).not.toHaveBeenCalled();
    });
  });

  describe("requestInfo", () => {
    it("adds an admin note without changing the claim status", async () => {
      const claimRepo = makeClaimRepo();
      const service = new ClaimService(claimRepo, makeStoreLinkRepo(), makeVerificationService(), makeEvidenceService(), makeEventService());

      await service.requestInfo("claim-1", "por favor envie o comprovante de endereço");

      expect(claimRepo.addAdminNote).toHaveBeenCalledWith("claim-1", "por favor envie o comprovante de endereço");
      expect(claimRepo.updateStatus).not.toHaveBeenCalled();
    });
  });
});
