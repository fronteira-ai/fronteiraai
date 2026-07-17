import { MarketplaceMemoryService } from "../services/MarketplaceMemoryService";
import type { ILearnedFactRepository } from "../repositories/ILearnedFactRepository";
import type { IMerchantAttributePatternRepository } from "../repositories/IMerchantAttributePatternRepository";
import { FactType } from "../types/enums";
import type { LearnedFact } from "../domain/LearnedFact";
import type { MerchantAttributePattern } from "../domain/MerchantAttributePattern";

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

function makePatternRepo(overrides: Partial<IMerchantAttributePatternRepository> = {}): IMerchantAttributePatternRepository {
  return {
    findByStoreId: jest.fn().mockResolvedValue([]),
    findByStoreAndKey: jest.fn().mockResolvedValue(null),
    upsert: jest.fn(),
    countTotal: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

const sampleFact: LearnedFact = {
  id: "fact-1",
  canonicalProductId: "product-1",
  factType: FactType.ManufacturerCode,
  factValue: "A3257",
  confidence: "medium",
  source: "name",
  extractedFrom: null,
  merchantId: null,
  origin: "backfill",
  validationStatus: "unvalidated",
  algorithmVersion: "1.0.0",
  createdAt: "2026-07-16T00:00:00Z",
  updatedAt: "2026-07-16T00:00:00Z",
};

describe("MarketplaceMemoryService", () => {
  it("getFactsForProduct delegates to the fact repository", async () => {
    const factRepo = makeFactRepo({ findByCanonicalProductId: jest.fn().mockResolvedValue([sampleFact]) });
    const service = new MarketplaceMemoryService(factRepo, makePatternRepo());

    const result = await service.getFactsForProduct("product-1");

    expect(factRepo.findByCanonicalProductId).toHaveBeenCalledWith("product-1");
    expect(result).toEqual([sampleFact]);
  });

  it("getProductsSharingFact reads by (factType, factValue) — the grouping key Mission Π-1 measured", async () => {
    const factRepo = makeFactRepo({ findByTypeAndValue: jest.fn().mockResolvedValue([sampleFact]) });
    const service = new MarketplaceMemoryService(factRepo, makePatternRepo());

    const result = await service.getProductsSharingFact(FactType.ManufacturerCode, "A3257");

    expect(factRepo.findByTypeAndValue).toHaveBeenCalledWith(FactType.ManufacturerCode, "A3257");
    expect(result).toEqual([sampleFact]);
  });

  it("learnFacts upserts each input in order and returns every result", async () => {
    const factRepo = makeFactRepo({ upsert: jest.fn().mockResolvedValue(sampleFact) });
    const service = new MarketplaceMemoryService(factRepo, makePatternRepo());

    const results = await service.learnFacts([
      { canonicalProductId: "product-1", factType: FactType.ManufacturerCode, factValue: "A3257", confidence: "medium", source: "name", extractedFrom: null, merchantId: null, origin: "backfill", algorithmVersion: "1.0.0" },
      { canonicalProductId: "product-1", factType: FactType.Color, factValue: "Preto", confidence: "high", source: "specifications", extractedFrom: null, merchantId: null, origin: "backfill", algorithmVersion: "1.0.0" },
    ]);

    expect(factRepo.upsert).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
  });

  it("observePattern increments occurrences on top of an existing pattern, never resets it", async () => {
    const existing: MerchantAttributePattern = {
      id: "pattern-1",
      storeId: "store-1",
      rawKey: "MODELO",
      concept: "model",
      confidence: "medium",
      occurrences: 4,
      algorithmVersion: "1.0.0",
      validationStatus: "unvalidated",
      createdAt: "2026-07-16T00:00:00Z",
      updatedAt: "2026-07-16T00:00:00Z",
    };
    const patternRepo = makePatternRepo({
      findByStoreAndKey: jest.fn().mockResolvedValue(existing),
      upsert: jest.fn().mockResolvedValue({ ...existing, occurrences: 5 }),
    });
    const service = new MarketplaceMemoryService(makeFactRepo(), patternRepo);

    await service.observePattern({ storeId: "store-1", rawKey: "MODELO", concept: "model", confidence: "medium", algorithmVersion: "1.0.0" });

    expect(patternRepo.upsert).toHaveBeenCalledWith(
      { storeId: "store-1", rawKey: "MODELO", concept: "model", confidence: "medium", algorithmVersion: "1.0.0" },
      5
    );
  });

  it("observePattern starts a brand-new (store, rawKey) pair at occurrences=1", async () => {
    const patternRepo = makePatternRepo({
      findByStoreAndKey: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({} as MerchantAttributePattern),
    });
    const service = new MarketplaceMemoryService(makeFactRepo(), patternRepo);

    await service.observePattern({ storeId: "store-1", rawKey: "Capacidad", concept: "capacity_gb", confidence: "medium", algorithmVersion: "1.0.0" });

    expect(patternRepo.upsert).toHaveBeenCalledWith(expect.anything(), 1);
  });
});
