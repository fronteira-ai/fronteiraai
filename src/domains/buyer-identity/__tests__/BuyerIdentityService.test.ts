import { BuyerIdentityService } from "../services/BuyerIdentityService";
import type { Buyer } from "../domain/Buyer";
import type { IBuyerRepository } from "../repositories/IBuyerRepository";

function makeBuyer(overrides: Partial<Buyer> = {}): Buyer {
  return {
    id: "buyer-1",
    authUserId: null,
    email: "buyer@example.com",
    emailVerifiedAt: null,
    displayName: null,
    phone: null,
    marketingOptIn: false,
    anonymizedAt: null,
    createdAt: "2026-07-13T00:00:00Z",
    ...overrides,
  };
}

function makeRepo(overrides: Partial<IBuyerRepository> = {}): IBuyerRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByAuthUserId: jest.fn().mockResolvedValue(null),
    findByEmail: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(null),
    linkAuthUser: jest.fn().mockResolvedValue(null),
    markEmailVerified: jest.fn().mockResolvedValue(null),
    anonymize: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("BuyerIdentityService", () => {
  describe("findOrCreateForAuthUser", () => {
    it("returns the existing buyer instead of creating a duplicate", async () => {
      const existing = makeBuyer({ authUserId: "auth-1" });
      const repo = makeRepo({ findByAuthUserId: jest.fn().mockResolvedValue(existing) });
      const service = new BuyerIdentityService(repo);

      const result = await service.findOrCreateForAuthUser("auth-1", "buyer@example.com");
      expect(result).toBe(existing);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it("creates a new buyer when none exists for this auth user", async () => {
      const created = makeBuyer({ authUserId: "auth-2" });
      const repo = makeRepo({
        findByAuthUserId: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      });
      const service = new BuyerIdentityService(repo);

      const result = await service.findOrCreateForAuthUser("auth-2", "new@example.com");
      expect(result).toBe(created);
      expect(repo.create).toHaveBeenCalledWith({ authUserId: "auth-2", email: "new@example.com" });
    });
  });

  describe("findOrCreateForEmail", () => {
    it("is idempotent by email — never creates a duplicate identity for the same email", async () => {
      const existing = makeBuyer({ email: "known@example.com" });
      const repo = makeRepo({ findByEmail: jest.fn().mockResolvedValue(existing) });
      const service = new BuyerIdentityService(repo);

      const result = await service.findOrCreateForEmail("known@example.com");
      expect(result).toBe(existing);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe("linkAuthUser", () => {
    it("bridges a Buyer Conhecido into a Buyer Autenticado without changing the buyer id", async () => {
      const linked = makeBuyer({ authUserId: "auth-3" });
      const repo = makeRepo({ linkAuthUser: jest.fn().mockResolvedValue(linked) });
      const service = new BuyerIdentityService(repo);

      const result = await service.linkAuthUser("buyer-1", "auth-3");
      expect(repo.linkAuthUser).toHaveBeenCalledWith("buyer-1", "auth-3");
      expect(result).toBe(linked);
    });
  });

  describe("anonymize", () => {
    it("delegates to the repository's anonymize (never a delete)", async () => {
      const anonymized = makeBuyer({ email: null, displayName: null, anonymizedAt: "2026-07-13T00:00:00Z" });
      const repo = makeRepo({ anonymize: jest.fn().mockResolvedValue(anonymized) });
      const service = new BuyerIdentityService(repo);

      const result = await service.anonymize("buyer-1");
      expect(repo.anonymize).toHaveBeenCalledWith("buyer-1");
      expect(result!.anonymizedAt).not.toBeNull();
    });
  });
});
