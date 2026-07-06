import { CatalogWriteStage } from "../services/stages/CatalogWriteStage";
import { makeNormalizedOffer } from "./helpers";
import type { ICatalogRepository } from "../repositories/ICatalogRepository";
import type { PipelineContext, DeduplicatedOffer } from "../types/pipeline.types";
import { initMetrics } from "../services/metrics";

function makeCatalogRepo(overrides: Partial<ICatalogRepository> = {}): ICatalogRepository {
  return {
    findProductIdsBySlugs: jest.fn().mockResolvedValue(new Map()),
    findStoreIdBySlug: jest.fn().mockResolvedValue("store-1"),
    findOfferByProductAndStore: jest.fn().mockResolvedValue(null),
    upsertBrand: jest.fn().mockResolvedValue("brand-1"),
    upsertCategory: jest.fn().mockResolvedValue("category-1"),
    upsertProduct: jest.fn().mockResolvedValue("product-1"),
    updateOffer: jest.fn().mockResolvedValue(undefined),
    upsertOffer: jest.fn().mockResolvedValue("offer-1"),
    insertPriceHistory: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeContext(catalogRepo: ICatalogRepository, deduplicated: DeduplicatedOffer[]): PipelineContext {
  return {
    connectorId: "test",
    batchId: "batch-1",
    dryRun: false,
    catalogRepo,
    storage: {} as never,
    productIdentityService: { evaluateAndLog: jest.fn().mockResolvedValue(undefined) } as never,
    changeDetectionService: { detectAndRecord: jest.fn().mockResolvedValue([]) } as never,
    raw: [],
    validated: [],
    normalized: [],
    deduplicated,
    persisted: [],
    metrics: initMetrics("test", "batch-1"),
    errors: [],
  };
}

describe("CatalogWriteStage", () => {
  it("marks everything 'skipped' without any repo writes in dry-run", async () => {
    const repo = makeCatalogRepo();
    const ctx = makeContext(repo, [{ normalized: makeNormalizedOffer(), status: "new" }]);
    ctx.dryRun = true;

    const result = await new CatalogWriteStage().execute(ctx);

    expect(result.persisted[0].action).toBe("skipped");
    expect(repo.upsertBrand).not.toHaveBeenCalled();
  });

  it("creates brand/category/product/offer for a 'new' item", async () => {
    const repo = makeCatalogRepo();
    const ctx = makeContext(repo, [{ normalized: makeNormalizedOffer(), status: "new" }]);

    const result = await new CatalogWriteStage().execute(ctx);

    expect(repo.upsertBrand).toHaveBeenCalledWith("TestBrand", "testbrand");
    expect(repo.upsertOffer).toHaveBeenCalled();
    expect(result.persisted[0].action).toBe("created");
  });

  it("updates the offer and records price_history for an 'update' item", async () => {
    const repo = makeCatalogRepo();
    const ctx = makeContext(repo, [
      { normalized: makeNormalizedOffer(), status: "update", existingProductId: "product-1", existingOfferId: "offer-1" },
    ]);

    const result = await new CatalogWriteStage().execute(ctx);

    expect(repo.updateOffer).toHaveBeenCalledWith("offer-1", expect.any(Object));
    expect(repo.insertPriceHistory).toHaveBeenCalledWith(expect.objectContaining({ offerId: "offer-1" }));
    expect(result.persisted[0].action).toBe("updated");
  });

  it("records price_history for a brand-new offer too (Wave 3 fix — history starts at first sync)", async () => {
    const repo = makeCatalogRepo();
    const ctx = makeContext(repo, [{ normalized: makeNormalizedOffer(), status: "new" }]);

    await new CatalogWriteStage().execute(ctx);

    expect(repo.insertPriceHistory).toHaveBeenCalledWith(expect.objectContaining({ offerId: "offer-1" }));
  });

  it("marks the item as an 'error' when the store does not exist", async () => {
    const repo = makeCatalogRepo({ findStoreIdBySlug: jest.fn().mockResolvedValue(null) });
    const ctx = makeContext(repo, [{ normalized: makeNormalizedOffer(), status: "new" }]);

    const result = await new CatalogWriteStage().execute(ctx);

    expect(result.persisted[0].action).toBe("error");
  });

  it("skips items already classified as 'skip' by DeduplicationStage", async () => {
    const repo = makeCatalogRepo();
    const ctx = makeContext(repo, [
      { normalized: makeNormalizedOffer(), status: "skip", existingOfferId: "offer-1" },
    ]);

    const result = await new CatalogWriteStage().execute(ctx);

    expect(result.persisted[0].action).toBe("skipped");
    expect(repo.upsertBrand).not.toHaveBeenCalled();
  });
});
