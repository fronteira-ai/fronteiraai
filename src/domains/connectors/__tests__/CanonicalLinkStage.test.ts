import { CanonicalLinkStage } from "../services/stages/CanonicalLinkStage";
import { makeNormalizedOffer } from "./helpers";
import type { ICatalogRepository, ResolvedProduct } from "../repositories/ICatalogRepository";
import type { PipelineContext, DeduplicatedOffer, PersistenceResult } from "../types/pipeline.types";
import { initMetrics } from "../services/metrics";
import type { CanonicalProduct } from "@/src/domains/canonical-catalog";

function makeResolvedProduct(overrides: Partial<ResolvedProduct> = {}): ResolvedProduct {
  return {
    id: "product-1",
    slug: "test-product",
    name: "Test Product",
    brandId: "brand-1",
    categoryId: "category-1",
    imageUrl: null,
    specifications: {},
    ...overrides,
  };
}

function makeCanonicalProduct(overrides: Partial<CanonicalProduct> = {}): CanonicalProduct {
  return {
    id: "canonical-1",
    canonicalSlug: "test-product",
    name: "Test Product",
    brandId: "brand-1",
    categoryId: "category-1",
    imageUrl: null,
    specifications: {},
    createdAt: "2026-07-24T00:00:00Z",
    updatedAt: "2026-07-24T00:00:00Z",
    isActive: true,
    mergedIntoId: null,
    ...overrides,
  };
}

function makeCatalogRepo(overrides: Partial<ICatalogRepository> = {}): ICatalogRepository {
  return {
    findProductIdsBySlugs: jest.fn().mockResolvedValue(new Map()),
    findProductById: jest.fn().mockResolvedValue(makeResolvedProduct()),
    findProductsAfterId: jest.fn().mockResolvedValue([]),
    findOfferIdsByProductId: jest.fn().mockResolvedValue([]),
    findStoreIdBySlug: jest.fn().mockResolvedValue("store-1"),
    findOfferByProductAndStore: jest.fn().mockResolvedValue(null),
    upsertBrand: jest.fn().mockResolvedValue("brand-1"),
    upsertCategory: jest.fn().mockResolvedValue("category-1"),
    upsertProduct: jest.fn().mockResolvedValue("product-1"),
    updateOffer: jest.fn().mockResolvedValue(undefined),
    upsertOffer: jest.fn().mockResolvedValue("offer-1"),
    insertPriceHistory: jest.fn().mockResolvedValue(undefined),
    findBrandByNormalizedName: jest.fn().mockResolvedValue(null),
    findCategoryByNormalizedName: jest.fn().mockResolvedValue(null),
    findBrandIdByIdentifier: jest.fn().mockResolvedValue(null),
    recordProductIdentifier: jest.fn().mockResolvedValue(undefined),
    createPendingReview: jest.fn().mockResolvedValue(undefined),
    findPendingReviewsByStoreFieldValue: jest.fn().mockResolvedValue([]),
    resolvePendingReview: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makePersisted(overrides: Partial<PersistenceResult> = {}): PersistenceResult {
  return { productSlug: "test-product", storeSlug: "test-store", action: "created", productId: "product-1", offerId: "offer-1", storeId: "store-1", ...overrides };
}

function makeContext(opts: {
  catalogRepo?: ICatalogRepository;
  persisted?: PersistenceResult[];
  bootstrapFromProduct?: jest.Mock;
  linkOffer?: jest.Mock;
  enqueue?: jest.Mock;
  nullServices?: boolean;
  dryRun?: boolean;
} = {}): PipelineContext {
  const deduplicated: DeduplicatedOffer[] = (opts.persisted ?? [makePersisted()]).map(() => ({ normalized: makeNormalizedOffer(), status: "new" }));

  return {
    connectorId: "test-connector",
    batchId: "batch-1",
    dryRun: opts.dryRun ?? false,
    catalogRepo: opts.catalogRepo ?? makeCatalogRepo(),
    storage: {} as never,
    productIdentityService: {} as never,
    changeDetectionService: {} as never,
    marketplaceMemoryService: null,
    canonicalProductService: opts.nullServices
      ? null
      : ({ bootstrapFromProduct: opts.bootstrapFromProduct ?? jest.fn().mockResolvedValue(makeCanonicalProduct()) } as never),
    canonicalCatalogRepo: opts.nullServices ? null : ({ linkOffer: opts.linkOffer ?? jest.fn().mockResolvedValue(undefined) } as never),
    canonicalSuggestionOutboxRepo: opts.nullServices ? null : ({ enqueue: opts.enqueue ?? jest.fn().mockResolvedValue(undefined) } as never),
    raw: [],
    validated: [],
    normalized: [],
    deduplicated,
    persisted: opts.persisted ?? [makePersisted()],
    metrics: initMetrics("test-connector", "batch-1"),
    errors: [],
  };
}

describe("CanonicalLinkStage", () => {
  it("no-ops in dry-run — no service is called", async () => {
    const bootstrapFromProduct = jest.fn();
    const ctx = makeContext({ dryRun: true, bootstrapFromProduct });

    const result = await new CanonicalLinkStage().execute(ctx);

    expect(bootstrapFromProduct).not.toHaveBeenCalled();
    expect(result.metrics.stages[0].skipped).toBe(1);
  });

  it("no-ops when canonical services are not wired (null) — graceful degradation, never throws", async () => {
    const ctx = makeContext({ nullServices: true });

    const result = await new CanonicalLinkStage().execute(ctx);

    expect(result.errors).toHaveLength(0);
    expect(result.metrics.stages[0].skipped).toBe(1);
  });

  it("happy path: bootstraps, links, and enqueues a newly-created item", async () => {
    const bootstrapFromProduct = jest.fn().mockResolvedValue(makeCanonicalProduct());
    const linkOffer = jest.fn().mockResolvedValue(undefined);
    const enqueue = jest.fn().mockResolvedValue(undefined);
    const ctx = makeContext({ bootstrapFromProduct, linkOffer, enqueue });

    const result = await new CanonicalLinkStage().execute(ctx);

    expect(bootstrapFromProduct).toHaveBeenCalledWith({
      slug: "test-product",
      name: "Test Product",
      brandId: "brand-1",
      categoryId: "category-1",
      imageUrl: null,
      specifications: {},
    });
    expect(linkOffer).toHaveBeenCalledWith("offer-1", "canonical-1");
    expect(enqueue).toHaveBeenCalledWith("canonical-1", "test-connector:batch-1");
    expect(result.metrics.stages[0].details).toMatchObject({
      offersProcessed: 1,
      canonicalCreated: 1,
      canonicalReused: 0,
      linksSucceeded: 1,
      bootstrapFailures: 0,
      linkFailures: 0,
      enqueued: 1,
    });
  });

  it("counts a canonical product as reused when createdAt !== updatedAt", async () => {
    const bootstrapFromProduct = jest.fn().mockResolvedValue(makeCanonicalProduct({ createdAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-24T00:00:00Z" }));
    const ctx = makeContext({ bootstrapFromProduct });

    const result = await new CanonicalLinkStage().execute(ctx);

    expect(result.metrics.stages[0].details).toMatchObject({ canonicalCreated: 0, canonicalReused: 1 });
  });

  it("skips items that were not created/updated, or lack offerId/productId — never calls any service for them", async () => {
    const bootstrapFromProduct = jest.fn();
    const persisted = [makePersisted({ action: "skipped", offerId: undefined, productId: undefined })];
    const ctx = makeContext({ persisted, bootstrapFromProduct });

    const result = await new CanonicalLinkStage().execute(ctx);

    expect(bootstrapFromProduct).not.toHaveBeenCalled();
    expect(result.metrics.stages[0].skipped).toBe(1);
  });

  it("isolates a bootstrap failure — records the error, never calls linkOffer/enqueue for that item, never throws", async () => {
    const bootstrapFromProduct = jest.fn().mockRejectedValue(new Error("boom"));
    const linkOffer = jest.fn();
    const enqueue = jest.fn();
    const ctx = makeContext({ bootstrapFromProduct, linkOffer, enqueue });

    const result = await new CanonicalLinkStage().execute(ctx);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain("bootstrapFromProduct failed");
    expect(linkOffer).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
    expect(result.metrics.stages[0].details).toMatchObject({ bootstrapFailures: 1, linksSucceeded: 0 });
  });

  it("isolates a linkOffer failure — canonical was still bootstrapped, but enqueue is never called (not actually linked yet)", async () => {
    const linkOffer = jest.fn().mockRejectedValue(new Error("link boom"));
    const enqueue = jest.fn();
    const ctx = makeContext({ linkOffer, enqueue });

    const result = await new CanonicalLinkStage().execute(ctx);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain("linkOffer failed");
    expect(enqueue).not.toHaveBeenCalled();
    expect(result.metrics.stages[0].details).toMatchObject({ linkFailures: 1, linksSucceeded: 0 });
  });

  it("isolates an enqueue failure without undoing the already-successful link — self-heals later", async () => {
    const linkOffer = jest.fn().mockResolvedValue(undefined);
    const enqueue = jest.fn().mockRejectedValue(new Error("enqueue boom"));
    const ctx = makeContext({ linkOffer, enqueue });

    const result = await new CanonicalLinkStage().execute(ctx);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain("outbox enqueue failed");
    expect(linkOffer).toHaveBeenCalled(); // link itself succeeded and is durable
    expect(result.metrics.stages[0].details).toMatchObject({ linksSucceeded: 1, enqueueFailures: 1, enqueued: 0 });
  });

  it("treats a missing product (findProductById -> null) as a bootstrap failure, isolated", async () => {
    const catalogRepo = makeCatalogRepo({ findProductById: jest.fn().mockResolvedValue(null) });
    const bootstrapFromProduct = jest.fn();
    const ctx = makeContext({ catalogRepo, bootstrapFromProduct });

    const result = await new CanonicalLinkStage().execute(ctx);

    expect(bootstrapFromProduct).not.toHaveBeenCalled();
    expect(result.errors).toHaveLength(1);
    expect(result.metrics.stages[0].details).toMatchObject({ bootstrapFailures: 1 });
  });

  it("processes every eligible item even when one of them fails — no item aborts the batch", async () => {
    const bootstrapFromProduct = jest
      .fn()
      .mockResolvedValueOnce(makeCanonicalProduct())
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(makeCanonicalProduct({ id: "canonical-3" }));
    const persisted = [
      makePersisted({ productSlug: "p1", offerId: "offer-1", productId: "product-1" }),
      makePersisted({ productSlug: "p2", offerId: "offer-2", productId: "product-2" }),
      makePersisted({ productSlug: "p3", offerId: "offer-3", productId: "product-3" }),
    ];
    const ctx = makeContext({ persisted, bootstrapFromProduct });

    const result = await new CanonicalLinkStage().execute(ctx);

    expect(bootstrapFromProduct).toHaveBeenCalledTimes(3);
    expect(result.errors).toHaveLength(1);
    expect(result.metrics.stages[0].details).toMatchObject({ offersProcessed: 3, linksSucceeded: 2, bootstrapFailures: 1 });
  });
});
