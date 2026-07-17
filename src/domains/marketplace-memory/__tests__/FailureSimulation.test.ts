import { MarketplaceMemoryService } from "../services/MarketplaceMemoryService";
import type { ILearnedFactRepository } from "../repositories/ILearnedFactRepository";
import type { IMerchantAttributePatternRepository } from "../repositories/IMerchantAttributePatternRepository";
import { FactType } from "../types/enums";
import type { LearnedFact } from "../domain/LearnedFact";

// Program Ω — Implementation Phase, Mission Ω-2 (Shadow Validation),
// Objetivo 6 — Failure Simulation. Each scenario named in the mission
// brief, simulated at the layer where it's actually observable —
// migration-level scenarios (rollback, interrupted migration) are
// verified structurally against the migration SQL, not here (no local
// Postgres available, documented in Mission Ω-1's report); everything
// observable at the application layer is a real test below.

function makeFactRepo(overrides: Partial<ILearnedFactRepository> = {}): ILearnedFactRepository {
  return {
    findByCanonicalProductId: jest.fn().mockResolvedValue([]),
    findByTypeAndValue: jest.fn().mockResolvedValue([]),
    upsert: jest.fn(),
    findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    countByFactType: jest.fn().mockResolvedValue(0),
    countTotal: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function makePatternRepo(): IMerchantAttributePatternRepository {
  return {
    findByStoreId: jest.fn().mockResolvedValue([]),
    findByStoreAndKey: jest.fn().mockResolvedValue(null),
    upsert: jest.fn(),
    countTotal: jest.fn().mockResolvedValue(0),
  };
}

const validInput = {
  canonicalProductId: "product-1",
  factType: FactType.ManufacturerCode,
  factValue: "A3257",
  confidence: "medium" as const,
  source: "name" as const,
  extractedFrom: null,
  merchantId: null,
  origin: "backfill" as const,
  algorithmVersion: "1.0.0",
};

describe("Failure Simulation (Objetivo 6)", () => {
  describe("registro inválido — DB CHECK constraint violation", () => {
    it("propagates the error rather than swallowing it (learnFact)", async () => {
      const factRepo = makeFactRepo({
        upsert: jest.fn().mockRejectedValue(new Error('learned fact upsert: new row violates check constraint "marketplace_memory_facts_fact_type_check"')),
      });
      const service = new MarketplaceMemoryService(factRepo, makePatternRepo());

      await expect(service.learnFact(validInput)).rejects.toThrow(/check constraint/);
    });

    it("REAL FINDING: learnFacts (batch) has no per-item isolation — one invalid fact aborts the whole batch mid-way, leaving earlier upserts in this call already committed but later ones never attempted", async () => {
      const upsert = jest
        .fn()
        .mockResolvedValueOnce({ id: "fact-1" } as unknown as LearnedFact)
        .mockRejectedValueOnce(new Error("check constraint violation"))
        .mockResolvedValueOnce({ id: "fact-3" } as unknown as LearnedFact);
      const factRepo = makeFactRepo({ upsert });
      const service = new MarketplaceMemoryService(factRepo, makePatternRepo());

      await expect(
        service.learnFacts([
          { ...validInput, factType: FactType.ManufacturerCode },
          { ...validInput, factType: FactType.Color },
          { ...validInput, factType: FactType.Model },
        ])
      ).rejects.toThrow();

      // The 3rd fact is never attempted — confirms the batch is not
      // fault-isolated. Documented as a real gap for a future Learning
      // Engine Mission (per-item try/catch, same discipline
      // MergeExecutorService.executeBatch already uses).
      expect(upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe("registro duplicado — same (canonicalProductId, factType) upserted twice", () => {
    it("the repository contract is upsert (update-in-place), never insert — no duplicate is possible through this API", async () => {
      const upsert = jest.fn().mockResolvedValue({ id: "fact-1", factValue: "A3257" } as unknown as LearnedFact);
      const factRepo = makeFactRepo({ upsert });
      const service = new MarketplaceMemoryService(factRepo, makePatternRepo());

      await service.learnFact(validInput);
      await service.learnFact({ ...validInput, factValue: "A9999" }); // same key, new value

      expect(upsert).toHaveBeenCalledTimes(2);
      // Both calls target the identical (canonicalProductId, factType) —
      // the DB's UNIQUE(canonical_product_id, fact_type) constraint plus
      // ON CONFLICT is what actually prevents a second row from Postgres's
      // side; this test documents the application-level contract that
      // makes that constraint reachable (never a raw INSERT).
      expect(upsert.mock.calls[0][0].canonicalProductId).toBe(upsert.mock.calls[1][0].canonicalProductId);
      expect(upsert.mock.calls[0][0].factType).toBe(upsert.mock.calls[1][0].factType);
    });
  });

  describe("algoritmo atualizado — a newer algorithmVersion overwrites an older fact", () => {
    it("upsert always takes the latest computation as truth — no version-aware reconciliation exists yet (Learning Engine's future job, not this Foundation's)", async () => {
      const upsert = jest.fn().mockResolvedValue({ id: "fact-1", algorithmVersion: "1.1.0" } as unknown as LearnedFact);
      const factRepo = makeFactRepo({ upsert });
      const service = new MarketplaceMemoryService(factRepo, makePatternRepo());

      const result = await service.learnFact({ ...validInput, algorithmVersion: "1.1.0" });

      expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ algorithmVersion: "1.1.0" }));
      expect(result.algorithmVersion).toBe("1.1.0");
      // Deliberately no assertion that the OLD version is preserved
      // anywhere — it isn't. Confirmed gap, documented in the mission
      // response, not silently assumed.
    });
  });

  describe("occurrences counter under concurrent-looking calls (pattern learning)", () => {
    it("observePattern reads-then-writes — two calls in quick succession without an intervening read would both compute the same next value (a real race, not simulated further here — Learning Engine's concern)", async () => {
      const existing = { occurrences: 4 } as unknown as Awaited<ReturnType<IMerchantAttributePatternRepository["findByStoreAndKey"]>>;
      const patternRepo: IMerchantAttributePatternRepository = {
        findByStoreId: jest.fn(),
        findByStoreAndKey: jest.fn().mockResolvedValue(existing),
        upsert: jest.fn().mockResolvedValue({} as never),
        countTotal: jest.fn(),
      };
      const service = new MarketplaceMemoryService(makeFactRepo(), patternRepo);

      await Promise.all([
        service.observePattern({ storeId: "store-1", rawKey: "MODELO", concept: "model", confidence: "medium", algorithmVersion: "1.0.0" }),
        service.observePattern({ storeId: "store-1", rawKey: "MODELO", concept: "model", confidence: "medium", algorithmVersion: "1.0.0" }),
      ]);

      // Both calls read occurrences=4 and both wrote occurrences=5 — a
      // real lost-update race under true concurrency. This Mission's
      // backfill script avoids it by running sequentially (documented in
      // Mission Ω-1's report as a real, accepted cost at today's scale);
      // flagged here as a genuine constraint, not fixed (would be new
      // code/locking logic, out of scope for Shadow Validation).
      expect(patternRepo.upsert).toHaveBeenNthCalledWith(1, expect.anything(), 5);
      expect(patternRepo.upsert).toHaveBeenNthCalledWith(2, expect.anything(), 5);
    });
  });
});
