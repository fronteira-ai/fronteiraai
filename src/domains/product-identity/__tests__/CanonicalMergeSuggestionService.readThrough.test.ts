import { CanonicalMergeSuggestionService, readThroughMetrics, resetReadThroughMetricsForTests } from "../services/CanonicalMergeSuggestionService";
import type { ICanonicalCatalogRepository, CanonicalProduct, IMergeCandidateRepository } from "@/src/domains/canonical-catalog";
import { FactType, type LearnedFact, type MarketplaceMemoryService } from "@/src/domains/marketplace-memory";

// Program Ω — Implementation Phase, Mission Ω-3 (Product Identity
// Read-Through Integration). Every test here manages the two env vars
// that gate this feature explicitly, so no test leaks its flag state into
// another (and so the DEFAULT state — both unset — is exercised too,
// confirming the "zero regressions out of the box" contract).

function makeCanonicalProduct(overrides: Partial<CanonicalProduct> = {}): CanonicalProduct {
  return {
    id: "canonical-1",
    canonicalSlug: "notebook-acer-aspire-3-a315-23-r7ve",
    name: "Notebook Acer Aspire 3 A315-23-R7VE",
    brandId: "brand-acer",
    categoryId: "category-notebooks",
    imageUrl: null,
    specifications: { ram: "8GB", storage: "256GB SSD" },
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    isActive: true,
    mergedIntoId: null,
    ...overrides,
  };
}

// `suggestMergesFor` filters the source out of its own candidate pool —
// findByBrandId resolving to [source] alone always yields an empty
// candidate list and an early return, before toEvaluableProduct/
// toMatchCandidate (and therefore the read-through path) is ever reached.
// Every test that needs the read-through code exercised needs a real
// second product in the brand cohort — this pair is that fixture, always
// used together.
function makeSourceAndTarget(sourceOverrides: Partial<CanonicalProduct> = {}): { source: CanonicalProduct; target: CanonicalProduct } {
  const source = makeCanonicalProduct(sourceOverrides);
  const target = makeCanonicalProduct({ id: "canonical-2", canonicalSlug: "notebook-acer-aspire-3-a315-23-r7ve-2" });
  return { source, target };
}

function makeCatalogRepo(overrides: Partial<ICanonicalCatalogRepository> = {}): ICanonicalCatalogRepository {
  return {
    findBySlug: jest.fn(),
    findById: jest.fn(),
    findOrCreateBySlug: jest.fn(),
    updateSyncedFields: jest.fn(),
    findByBrandId: jest.fn().mockResolvedValue([]),
    findByCategoryId: jest.fn().mockResolvedValue([]),
    findCanonicalProductIdByProductId: jest.fn(),
    findCategorySlugsByIds: jest.fn().mockResolvedValue(new Map()),
    findAll: jest.fn(),
    linkOffer: jest.fn(),
    findOffersByCanonicalProductId: jest.fn(),
    findOfferIdsByCanonicalProductId: jest.fn(),
    reassignOffers: jest.fn(),
    reassignOffersByIds: jest.fn(),
    deactivateAndMerge: jest.fn(),
    reactivate: jest.fn(),
    ...overrides,
  };
}

function makeMergeCandidateRepo(overrides: Partial<IMergeCandidateRepository> = {}): IMergeCandidateRepository {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByStatus: jest.fn(),
    findByPair: jest.fn().mockResolvedValue(null),
    updateStatus: jest.fn(),
    ...overrides,
  };
}

function makeFact(overrides: Partial<LearnedFact> = {}): LearnedFact {
  return {
    id: "fact-1",
    canonicalProductId: "canonical-1",
    factType: FactType.ManufacturerCode,
    factValue: "A315-23-R7VE",
    confidence: "medium",
    source: "name",
    extractedFrom: null,
    merchantId: null,
    origin: "backfill",
    validationStatus: "unvalidated",
    algorithmVersion: "1.0.0",
    createdAt: "2026-07-16T00:00:00Z",
    updatedAt: "2026-07-16T00:00:00Z",
    ...overrides,
  };
}

function makeMemoryService(overrides: Partial<{ getFactsForProduct: jest.Mock; learnFacts: jest.Mock }> = {}) {
  return {
    getFactsForProduct: jest.fn().mockResolvedValue([]),
    learnFacts: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as MarketplaceMemoryService;
}

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  resetReadThroughMetricsForTests();
});

describe("Objetivo 7 — Feature Flag (rollout percent, no redeploy needed)", () => {
  it("default (env var unset) never engages read-through — identical to pre-Mission behavior", async () => {
    delete process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT;
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({ findById: jest.fn().mockResolvedValue(source), findByBrandId: jest.fn().mockResolvedValue([source, target]) });
    const memoryService = makeMemoryService();
    const service = new CanonicalMergeSuggestionService(catalogRepo, makeMergeCandidateRepo(), memoryService);

    await service.suggestMergesFor("canonical-1");

    expect(memoryService.getFactsForProduct).not.toHaveBeenCalled();
    expect(readThroughMetrics.reads).toBe(0);
  });

  it("rollout=0 explicitly never engages read-through", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "0";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({ findById: jest.fn().mockResolvedValue(source), findByBrandId: jest.fn().mockResolvedValue([source, target]) });
    const memoryService = makeMemoryService();
    const service = new CanonicalMergeSuggestionService(catalogRepo, makeMergeCandidateRepo(), memoryService);

    await service.suggestMergesFor("canonical-1");

    expect(memoryService.getFactsForProduct).not.toHaveBeenCalled();
  });

  it("rollout=100 always engages read-through, regardless of product id", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({ findById: jest.fn().mockResolvedValue(source), findByBrandId: jest.fn().mockResolvedValue([source, target]) });
    const memoryService = makeMemoryService();
    const service = new CanonicalMergeSuggestionService(catalogRepo, makeMergeCandidateRepo(), memoryService);

    await service.suggestMergesFor("canonical-1");

    expect(memoryService.getFactsForProduct).toHaveBeenCalledWith("canonical-1");
    expect(readThroughMetrics.reads).toBeGreaterThan(0);
  });

  it("no memoryService passed at all (2-arg construction) never engages read-through even at rollout=100", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({ findById: jest.fn().mockResolvedValue(source), findByBrandId: jest.fn().mockResolvedValue([source, target]) });
    const service = new CanonicalMergeSuggestionService(catalogRepo, makeMergeCandidateRepo()); // no 3rd arg

    await expect(service.suggestMergesFor("canonical-1")).resolves.not.toThrow();
    expect(readThroughMetrics.reads).toBe(0);
  });
});

describe("Objetivo 1 — Read-Through flow (hit reuses, miss computes+persists)", () => {
  it("hit: valid fact found -> reused, and the run still produces the same real MergeCandidate as the non-read-through path", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    process.env.PRODUCT_IDENTITY_MEMORY_PARITY_SAMPLE_PERCENT = "100";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({ findById: jest.fn().mockResolvedValue(source), findByBrandId: jest.fn().mockResolvedValue([source, target]) });
    const memoryService = makeMemoryService({
      // Real value for this fixture's name — extractManufacturerCode("Notebook Acer Aspire 3 A315-23-R7VE") really does yield "A315-23-R7VE".
      getFactsForProduct: jest.fn().mockResolvedValue([makeFact({ factType: FactType.ManufacturerCode, factValue: "A315-23-R7VE" })]),
    });
    const mergeCandidateRepo = makeMergeCandidateRepo();
    const service = new CanonicalMergeSuggestionService(catalogRepo, mergeCandidateRepo, memoryService);

    await service.suggestMergesFor("canonical-1");

    expect(readThroughMetrics.hits).toBeGreaterThan(0);
    expect(readThroughMetrics.misses).toBe(0);
    expect(mergeCandidateRepo.create).toHaveBeenCalledTimes(1); // same real outcome as without read-through
  });

  it("miss: no facts found -> runs current pipeline -> persists result via learnFacts -> still returns normally", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({ findById: jest.fn().mockResolvedValue(source), findByBrandId: jest.fn().mockResolvedValue([source, target]) });
    const memoryService = makeMemoryService({ getFactsForProduct: jest.fn().mockResolvedValue([]) });
    const service = new CanonicalMergeSuggestionService(catalogRepo, makeMergeCandidateRepo(), memoryService);

    await service.suggestMergesFor("canonical-1");

    expect(readThroughMetrics.misses).toBeGreaterThan(0);
    expect(memoryService.learnFacts).toHaveBeenCalled();
  });

  it("miss with zero extractable facts never calls learnFacts with an empty array (no pointless write)", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    // Both sides deliberately have nothing extractable — a candidate with
    // real data would correctly trigger its own learnFacts call, which
    // isn't what this test is checking.
    const source = makeCanonicalProduct({ name: "x", specifications: null });
    const target = makeCanonicalProduct({ id: "canonical-2", canonicalSlug: "x-2", name: "y", specifications: null });
    const catalogRepo = makeCatalogRepo({ findById: jest.fn().mockResolvedValue(source), findByBrandId: jest.fn().mockResolvedValue([source, target]) });
    const memoryService = makeMemoryService({ getFactsForProduct: jest.fn().mockResolvedValue([]) });
    const service = new CanonicalMergeSuggestionService(catalogRepo, makeMergeCandidateRepo(), memoryService);

    await service.suggestMergesFor("canonical-1");

    expect(memoryService.learnFacts).not.toHaveBeenCalled();
  });
});

describe("Objetivo 2 — Fallback (any read failure -> old pipeline, never throws)", () => {
  it("getFactsForProduct rejecting falls back silently and completes normally", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({ findById: jest.fn().mockResolvedValue(source), findByBrandId: jest.fn().mockResolvedValue([source, target]) });
    const mergeCandidateRepo = makeMergeCandidateRepo();
    const memoryService = makeMemoryService({ getFactsForProduct: jest.fn().mockRejectedValue(new Error("Memory unavailable")) });
    const service = new CanonicalMergeSuggestionService(catalogRepo, mergeCandidateRepo, memoryService);

    await expect(service.suggestMergesFor("canonical-1")).resolves.not.toThrow();
    expect(readThroughMetrics.fallbacks).toBeGreaterThan(0);
    expect(mergeCandidateRepo.create).toHaveBeenCalledTimes(1); // real outcome unaffected
  });

  it("learnFacts (write-back) rejecting on a miss still returns normally — a failed persist never blocks the read path", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({ findById: jest.fn().mockResolvedValue(source), findByBrandId: jest.fn().mockResolvedValue([source, target]) });
    const memoryService = makeMemoryService({
      getFactsForProduct: jest.fn().mockResolvedValue([]),
      learnFacts: jest.fn().mockRejectedValue(new Error("write failed")),
    });
    const service = new CanonicalMergeSuggestionService(catalogRepo, makeMergeCandidateRepo(), memoryService);

    await expect(service.suggestMergesFor("canonical-1")).resolves.not.toThrow();
  });
});

describe("Objetivo 3 — Continuous parity validation", () => {
  it("a divergent reused value is detected, counted, and the FRESH value wins (safety-first) — the real outcome is unaffected by the wrong cached value", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    process.env.PRODUCT_IDENTITY_MEMORY_PARITY_SAMPLE_PERCENT = "100";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({ findById: jest.fn().mockResolvedValue(source), findByBrandId: jest.fn().mockResolvedValue([source, target]) });
    // Deliberately wrong stored value — simulates a stale/divergent fact.
    const memoryService = makeMemoryService({
      getFactsForProduct: jest.fn().mockResolvedValue([makeFact({ factType: FactType.ManufacturerCode, factValue: "WRONG-VALUE" })]),
    });
    const mergeCandidateRepo = makeMergeCandidateRepo();
    const service = new CanonicalMergeSuggestionService(catalogRepo, mergeCandidateRepo, memoryService);

    await service.suggestMergesFor("canonical-1");

    expect(readThroughMetrics.parityErrors).toBeGreaterThan(0);
    expect(mergeCandidateRepo.create).toHaveBeenCalledTimes(1); // same real result as if Memory had never been consulted
  });

  it("parity sample = 0 skips the check entirely — a divergence goes uncounted (documented trade-off of lowering the sample rate)", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    process.env.PRODUCT_IDENTITY_MEMORY_PARITY_SAMPLE_PERCENT = "0";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({ findById: jest.fn().mockResolvedValue(source), findByBrandId: jest.fn().mockResolvedValue([source, target]) });
    const memoryService = makeMemoryService({
      getFactsForProduct: jest.fn().mockResolvedValue([makeFact({ factType: FactType.ManufacturerCode, factValue: "WRONG-VALUE" })]),
    });
    const service = new CanonicalMergeSuggestionService(catalogRepo, makeMergeCandidateRepo(), memoryService);

    await service.suggestMergesFor("canonical-1");

    expect(readThroughMetrics.parityChecks).toBe(0);
    expect(readThroughMetrics.parityErrors).toBe(0);
  });
});

describe("Objetivo 6 — Resilience simulations", () => {
  it("registro corrompido (validationStatus='invalidated') is never reused — treated as a miss", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({ findById: jest.fn().mockResolvedValue(source), findByBrandId: jest.fn().mockResolvedValue([source, target]) });
    const memoryService = makeMemoryService({
      getFactsForProduct: jest.fn().mockResolvedValue([makeFact({ validationStatus: "invalidated" })]),
    });
    const service = new CanonicalMergeSuggestionService(catalogRepo, makeMergeCandidateRepo(), memoryService);

    await service.suggestMergesFor("canonical-1");

    expect(readThroughMetrics.misses).toBeGreaterThan(0);
    expect(readThroughMetrics.hits).toBe(0);
  });

  it("registro expirado / algoritmo atualizado (algorithmVersion mismatch) is never reused — treated as a miss, self-healing on write-back", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({ findById: jest.fn().mockResolvedValue(source), findByBrandId: jest.fn().mockResolvedValue([source, target]) });
    const memoryService = makeMemoryService({
      getFactsForProduct: jest.fn().mockResolvedValue([makeFact({ algorithmVersion: "0.0.1-old" })]),
    });
    const service = new CanonicalMergeSuggestionService(catalogRepo, makeMergeCandidateRepo(), memoryService);

    await service.suggestMergesFor("canonical-1");

    expect(readThroughMetrics.misses).toBeGreaterThan(0);
    expect(memoryService.learnFacts).toHaveBeenCalled(); // re-persisted under the current version
  });

  it("Marketplace Memory indisponível (every call rejects) never prevents a MergeCandidate from being created when the match is real", async () => {
    process.env.PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT = "100";
    const { source, target } = makeSourceAndTarget();
    const catalogRepo = makeCatalogRepo({ findById: jest.fn().mockResolvedValue(source), findByBrandId: jest.fn().mockResolvedValue([source, target]) });
    const mergeCandidateRepo = makeMergeCandidateRepo();
    const memoryService = makeMemoryService({
      getFactsForProduct: jest.fn().mockRejectedValue(new Error("connection refused")),
      learnFacts: jest.fn().mockRejectedValue(new Error("connection refused")),
    });
    const service = new CanonicalMergeSuggestionService(catalogRepo, mergeCandidateRepo, memoryService);

    await service.suggestMergesFor("canonical-1");

    // Same outcome as the pre-Mission, no-memory-service test — Marketplace
    // Memory being entirely down has zero effect on the actual merge
    // suggestion result.
    expect(mergeCandidateRepo.create).toHaveBeenCalledTimes(1);
  });
});
