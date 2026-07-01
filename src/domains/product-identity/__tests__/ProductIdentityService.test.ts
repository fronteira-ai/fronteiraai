import { ProductIdentityService } from "../services/ProductIdentityService";
import type { IProductCandidateRepository } from "../repositories/IProductCandidateRepository";
import type { IProductIdentityMatchLogRepository } from "../repositories/IProductIdentityMatchLogRepository";
import type { EvaluableProduct } from "../types/product-identity.types";

function makeProduct(overrides: Partial<EvaluableProduct> = {}): EvaluableProduct {
  return {
    slug: "test-product",
    name: "Test Product",
    brandSlug: "test-brand",
    categorySlug: "test-category",
    specifications: {},
    ...overrides,
  };
}

describe("ProductIdentityService", () => {
  it("fetches candidates by brand, evaluates, and records the result", async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const findByBrandSlug = jest.fn().mockResolvedValue([]);
    const candidateRepo: IProductCandidateRepository = { findByBrandSlug };
    const matchLogRepo: IProductIdentityMatchLogRepository = { record };

    const service = new ProductIdentityService(candidateRepo, matchLogRepo);
    await service.evaluateAndLog(makeProduct(), "store-1", "connector-1", "batch-1");

    expect(findByBrandSlug).toHaveBeenCalledWith("test-brand");
    expect(record).toHaveBeenCalledTimes(1);
    const entry = record.mock.calls[0][0];
    expect(entry.batchId).toBe("batch-1");
    expect(entry.connectorId).toBe("connector-1");
    expect(entry.candidateSlug).toBe("test-product");
    expect(entry.candidateStoreSlug).toBe("store-1");
    expect(entry.finalDecision).toBe("new-product");
    expect(typeof entry.algorithmVersion).toBe("string");
    expect(entry.algorithmVersion.length).toBeGreaterThan(0);
    expect(Array.isArray(entry.matchedAttributes)).toBe(true);
    expect(Array.isArray(entry.mismatchedAttributes)).toBe(true);
    expect(Array.isArray(entry.penalties)).toBe(true);
    expect(typeof entry.explainabilityReason).toBe("string");
    expect(entry.explainabilityReason.length).toBeGreaterThan(0);
    expect(typeof entry.processingTimeMs).toBe("number");
  });

  it("never throws when the candidate repository fails", async () => {
    const findByBrandSlug = jest.fn().mockRejectedValue(new Error("db down"));
    const record = jest.fn().mockResolvedValue(undefined);
    const service = new ProductIdentityService({ findByBrandSlug }, { record });

    await expect(service.evaluateAndLog(makeProduct(), "store-1", "connector-1", "batch-1")).resolves.toBeUndefined();
    expect(record).not.toHaveBeenCalled();
  });

  it("never throws when the match log repository fails", async () => {
    const findByBrandSlug = jest.fn().mockResolvedValue([]);
    const record = jest.fn().mockRejectedValue(new Error("insert failed"));
    const service = new ProductIdentityService({ findByBrandSlug }, { record });

    await expect(service.evaluateAndLog(makeProduct(), "store-1", "connector-1", "batch-1")).resolves.toBeUndefined();
  });
});
