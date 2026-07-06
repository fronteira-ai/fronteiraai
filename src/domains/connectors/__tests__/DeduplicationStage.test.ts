import { DeduplicationStage } from "../services/stages/DeduplicationStage";
import { makeNormalizedOffer } from "./helpers";
import type { ExistingOfferLookup, ICatalogRepository } from "../repositories/ICatalogRepository";
import type { PipelineContext } from "../types/pipeline.types";
import { initMetrics } from "../services/metrics";

function makeExistingOffer(overrides: Partial<ExistingOfferLookup> = {}): ExistingOfferLookup {
  return {
    offerId: "offer-1",
    priceUSD: 99.99,
    inStock: true,
    stockQuantity: null,
    description: "",
    imageUrl: null,
    ...overrides,
  };
}

function makeCatalogRepo(overrides: Partial<ICatalogRepository> = {}): ICatalogRepository {
  return {
    findProductIdsBySlugs: jest.fn().mockResolvedValue(new Map()),
    findStoreIdBySlug: jest.fn().mockResolvedValue("store-1"),
    findOfferByProductAndStore: jest.fn().mockResolvedValue(null),
    upsertBrand: jest.fn(),
    upsertCategory: jest.fn(),
    upsertProduct: jest.fn(),
    updateOffer: jest.fn(),
    upsertOffer: jest.fn(),
    insertPriceHistory: jest.fn(),
    ...overrides,
  };
}

function makeContext(catalogRepo: ICatalogRepository, normalized: PipelineContext["normalized"]): PipelineContext {
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
    normalized,
    deduplicated: [],
    persisted: [],
    metrics: initMetrics("test", "batch-1"),
    errors: [],
  };
}

describe("DeduplicationStage", () => {
  it("classifies as 'new' when the product slug does not exist yet", async () => {
    const repo = makeCatalogRepo();
    const ctx = makeContext(repo, [makeNormalizedOffer()]);
    const result = await new DeduplicationStage().execute(ctx);
    expect(result.deduplicated[0].status).toBe("new");
  });

  it("classifies as 'skip' when nothing relevant changed", async () => {
    const repo = makeCatalogRepo({
      findProductIdsBySlugs: jest.fn().mockResolvedValue(new Map([["test-product", "product-1"]])),
      findOfferByProductAndStore: jest.fn().mockResolvedValue(makeExistingOffer()),
    });
    const ctx = makeContext(repo, [makeNormalizedOffer()]);
    const result = await new DeduplicationStage().execute(ctx);
    expect(result.deduplicated[0].status).toBe("skip");
  });

  it("classifies as 'update' when the price changed", async () => {
    const repo = makeCatalogRepo({
      findProductIdsBySlugs: jest.fn().mockResolvedValue(new Map([["test-product", "product-1"]])),
      findOfferByProductAndStore: jest.fn().mockResolvedValue(makeExistingOffer({ priceUSD: 50 })),
    });
    const ctx = makeContext(repo, [makeNormalizedOffer()]);
    const result = await new DeduplicationStage().execute(ctx);
    expect(result.deduplicated[0].status).toBe("update");
    expect(result.deduplicated[0].existingOfferId).toBe("offer-1");
  });

  it("classifies as 'update' when stock availability changed", async () => {
    const repo = makeCatalogRepo({
      findProductIdsBySlugs: jest.fn().mockResolvedValue(new Map([["test-product", "product-1"]])),
      findOfferByProductAndStore: jest.fn().mockResolvedValue(makeExistingOffer({ inStock: false })),
    });
    const ctx = makeContext(repo, [makeNormalizedOffer({ offer: { ...makeNormalizedOffer().offer, inStock: true } })]);
    const result = await new DeduplicationStage().execute(ctx);
    expect(result.deduplicated[0].status).toBe("update");
  });

  it("classifies as 'update' when the description changed", async () => {
    const repo = makeCatalogRepo({
      findProductIdsBySlugs: jest.fn().mockResolvedValue(new Map([["test-product", "product-1"]])),
      findOfferByProductAndStore: jest.fn().mockResolvedValue(makeExistingOffer({ description: "old description" })),
    });
    const offer = makeNormalizedOffer({ product: { ...makeNormalizedOffer().product, description: "new description" } });
    const ctx = makeContext(repo, [offer]);
    const result = await new DeduplicationStage().execute(ctx);
    expect(result.deduplicated[0].status).toBe("update");
  });

  it("classifies as 'update' when the image changed", async () => {
    const repo = makeCatalogRepo({
      findProductIdsBySlugs: jest.fn().mockResolvedValue(new Map([["test-product", "product-1"]])),
      findOfferByProductAndStore: jest.fn().mockResolvedValue(makeExistingOffer({ imageUrl: "https://old.example/img.jpg" })),
    });
    const offer = makeNormalizedOffer({
      product: { ...makeNormalizedOffer().product, imageUrl: "https://new.example/img.jpg" },
    });
    const ctx = makeContext(repo, [offer]);
    const result = await new DeduplicationStage().execute(ctx);
    expect(result.deduplicated[0].status).toBe("update");
  });

  it("classifies as 'new' when the product exists but the store has no offer yet", async () => {
    const repo = makeCatalogRepo({
      findProductIdsBySlugs: jest.fn().mockResolvedValue(new Map([["test-product", "product-1"]])),
      findOfferByProductAndStore: jest.fn().mockResolvedValue(null),
    });
    const ctx = makeContext(repo, [makeNormalizedOffer()]);
    const result = await new DeduplicationStage().execute(ctx);
    expect(result.deduplicated[0].status).toBe("new");
    expect(result.deduplicated[0].existingProductId).toBe("product-1");
  });
});
