import { MergeExecutorService } from "../services/MergeExecutorService";
import type { ICanonicalCatalogRepository } from "../repositories/ICanonicalCatalogRepository";
import type { IMergeCandidateRepository } from "../repositories/IMergeCandidateRepository";
import type { IMergeExecutionRepository } from "../repositories/IMergeExecutionRepository";
import type { CanonicalProduct } from "../domain/CanonicalProduct";
import type { MergeCandidate } from "../domain/MergeCandidate";
import type { MergeExecution } from "../domain/MergeExecution";
import { MergeCandidateStatus, MergeExecutionStatus } from "../types/enums";

function makeCanonicalProduct(overrides: Partial<CanonicalProduct> = {}): CanonicalProduct {
  return {
    id: "canonical-1",
    canonicalSlug: "slug-1",
    name: "Product",
    brandId: "brand-1",
    categoryId: "category-1",
    imageUrl: null,
    specifications: null,
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    isActive: true,
    mergedIntoId: null,
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<MergeCandidate> = {}): MergeCandidate {
  return {
    id: "candidate-1",
    sourceCanonicalProductId: "source-1",
    targetCanonicalProductId: "target-1",
    confidence: 96,
    algorithmVersion: "1.0.0",
    matchedAttributes: [],
    mismatchedAttributes: [],
    penalties: [],
    reason: "test",
    status: MergeCandidateStatus.Pending,
    reviewedAt: null,
    reviewedBy: null,
    createdAt: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

function makeExecution(overrides: Partial<MergeExecution> = {}): MergeExecution {
  return {
    id: "execution-1",
    mergeCandidateId: "candidate-1",
    sourceCanonicalProductId: "source-1",
    targetCanonicalProductId: "target-1",
    movedOfferIds: ["offer-1", "offer-2"],
    status: MergeExecutionStatus.Executed,
    executedAt: "2026-07-14T00:00:00Z",
    executedBy: "cto@paraguai.com",
    rolledBackAt: null,
    rolledBackBy: null,
    ...overrides,
  };
}

function makeCatalogRepo(overrides: Partial<ICanonicalCatalogRepository> = {}): ICanonicalCatalogRepository {
  return {
    findBySlug: jest.fn(),
    findById: jest.fn(),
    findOrCreateBySlug: jest.fn(),
    updateSyncedFields: jest.fn(),
    findByBrandId: jest.fn(),
    findByCategoryId: jest.fn(),
    findCanonicalProductIdByProductId: jest.fn(),
    findCategorySlugsByIds: jest.fn().mockResolvedValue(new Map()),
    findAll: jest.fn(),
    linkOffer: jest.fn(),
    findOffersByCanonicalProductId: jest.fn(),
    findOfferIdsByCanonicalProductId: jest.fn().mockResolvedValue([]),
    reassignOffers: jest.fn().mockResolvedValue([]),
    reassignOffersByIds: jest.fn(),
    deactivateAndMerge: jest.fn(),
    reactivate: jest.fn(),
    ...overrides,
  };
}

function makeCandidateRepo(overrides: Partial<IMergeCandidateRepository> = {}): IMergeCandidateRepository {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByStatus: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    findByPair: jest.fn(),
    updateStatus: jest.fn(),
    ...overrides,
  };
}

function makeExecutionRepo(overrides: Partial<IMergeExecutionRepository> = {}): IMergeExecutionRepository {
  return {
    create: jest.fn().mockResolvedValue(makeExecution()),
    findById: jest.fn(),
    findByCandidateId: jest.fn(),
    findByStatus: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    markRolledBack: jest.fn(),
    ...overrides,
  };
}

describe("MergeExecutorService.approve/reject", () => {
  it("approve moves a Pending candidate to Approved and records the reviewer", async () => {
    const candidate = makeCandidate({ status: MergeCandidateStatus.Pending });
    const updateStatus = jest.fn();
    const service = new MergeExecutorService(
      makeCandidateRepo({ findById: jest.fn().mockResolvedValue(candidate), updateStatus }),
      makeCatalogRepo(),
      makeExecutionRepo()
    );

    const result = await service.approve("candidate-1", "reviewer@paraguai.com");

    expect(result).toEqual({ ok: true });
    expect(updateStatus).toHaveBeenCalledWith("candidate-1", MergeCandidateStatus.Approved, "reviewer@paraguai.com");
  });

  it("approve refuses a candidate that is not Pending — never auto-approves an already-decided candidate", async () => {
    const candidate = makeCandidate({ status: MergeCandidateStatus.Rejected });
    const updateStatus = jest.fn();
    const service = new MergeExecutorService(
      makeCandidateRepo({ findById: jest.fn().mockResolvedValue(candidate), updateStatus }),
      makeCatalogRepo(),
      makeExecutionRepo()
    );

    const result = await service.approve("candidate-1", "reviewer@paraguai.com");

    expect(result).toEqual({ ok: false, error: { code: "CANDIDATE_NOT_PENDING", message: expect.any(String) } });
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it("reject moves a Pending candidate to Rejected", async () => {
    const candidate = makeCandidate({ status: MergeCandidateStatus.Pending });
    const updateStatus = jest.fn();
    const service = new MergeExecutorService(
      makeCandidateRepo({ findById: jest.fn().mockResolvedValue(candidate), updateStatus }),
      makeCatalogRepo(),
      makeExecutionRepo()
    );

    const result = await service.reject("candidate-1", "reviewer@paraguai.com");

    expect(result).toEqual({ ok: true });
    expect(updateStatus).toHaveBeenCalledWith("candidate-1", MergeCandidateStatus.Rejected, "reviewer@paraguai.com");
  });
});

describe("MergeExecutorService.preview", () => {
  it("returns the exact offer ids that would move, without writing anything", async () => {
    const candidate = makeCandidate({ status: MergeCandidateStatus.Approved });
    const source = makeCanonicalProduct({ id: "source-1" });
    const target = makeCanonicalProduct({ id: "target-1" });
    const findOfferIdsByCanonicalProductId = jest.fn().mockResolvedValue(["offer-1", "offer-2"]);
    const reassignOffers = jest.fn();
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockImplementation(async (id: string) => (id === "source-1" ? source : target)),
      findOfferIdsByCanonicalProductId,
      reassignOffers,
    });
    const service = new MergeExecutorService(
      makeCandidateRepo({ findById: jest.fn().mockResolvedValue(candidate) }),
      catalogRepo,
      makeExecutionRepo()
    );

    const result = await service.preview("candidate-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.preview.offerIdsToMove).toEqual(["offer-1", "offer-2"]);
      expect(result.preview.source).toBe(source);
      expect(result.preview.target).toBe(target);
    }
    expect(reassignOffers).not.toHaveBeenCalled();
  });

  it("rejects when source and target are the same canonical product", async () => {
    const candidate = makeCandidate({ sourceCanonicalProductId: "x", targetCanonicalProductId: "x" });
    const service = new MergeExecutorService(
      makeCandidateRepo({ findById: jest.fn().mockResolvedValue(candidate) }),
      makeCatalogRepo(),
      makeExecutionRepo()
    );

    const result = await service.preview("candidate-1");
    expect(result).toEqual({ ok: false, error: { code: "SOURCE_EQUALS_TARGET", message: expect.any(String) } });
  });

  it("rejects when the source was already merged into another product", async () => {
    const candidate = makeCandidate();
    const source = makeCanonicalProduct({ id: "source-1", isActive: false });
    const target = makeCanonicalProduct({ id: "target-1" });
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockImplementation(async (id: string) => (id === "source-1" ? source : target)),
    });
    const service = new MergeExecutorService(
      makeCandidateRepo({ findById: jest.fn().mockResolvedValue(candidate) }),
      catalogRepo,
      makeExecutionRepo()
    );

    const result = await service.preview("candidate-1");
    expect(result).toEqual({ ok: false, error: { code: "SOURCE_ALREADY_MERGED", message: expect.any(String) } });
  });

  it("rejects when the target was already merged into another product (chain, not resolved here)", async () => {
    const candidate = makeCandidate();
    const source = makeCanonicalProduct({ id: "source-1" });
    const target = makeCanonicalProduct({ id: "target-1", isActive: false, mergedIntoId: "some-other-product" });
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockImplementation(async (id: string) => (id === "source-1" ? source : target)),
    });
    const service = new MergeExecutorService(
      makeCandidateRepo({ findById: jest.fn().mockResolvedValue(candidate) }),
      catalogRepo,
      makeExecutionRepo()
    );

    const result = await service.preview("candidate-1");
    expect(result).toEqual({ ok: false, error: { code: "TARGET_ALREADY_MERGED", message: expect.any(String) } });
  });
});

describe("MergeExecutorService.execute", () => {
  it("requires the candidate to already be Approved — Shadow Mode's human gate is never bypassed", async () => {
    const candidate = makeCandidate({ status: MergeCandidateStatus.Pending });
    const reassignOffers = jest.fn();
    const service = new MergeExecutorService(
      makeCandidateRepo({ findById: jest.fn().mockResolvedValue(candidate) }),
      makeCatalogRepo({ reassignOffers }),
      makeExecutionRepo()
    );

    const result = await service.execute("candidate-1", "cto@paraguai.com");

    expect(result).toEqual({ ok: false, error: { code: "CANDIDATE_NOT_APPROVED", message: expect.any(String) } });
    expect(reassignOffers).not.toHaveBeenCalled();
  });

  it("reassigns offers, deactivates the source, records an audit row, and flips the candidate to Merged", async () => {
    const candidate = makeCandidate({ status: MergeCandidateStatus.Approved });
    const source = makeCanonicalProduct({ id: "source-1" });
    const target = makeCanonicalProduct({ id: "target-1" });
    const reassignOffers = jest.fn().mockResolvedValue(["offer-1", "offer-2", "offer-3"]);
    const deactivateAndMerge = jest.fn();
    const updateStatus = jest.fn();
    const createExecution = jest.fn().mockResolvedValue(makeExecution({ movedOfferIds: ["offer-1", "offer-2", "offer-3"] }));

    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockImplementation(async (id: string) => (id === "source-1" ? source : target)),
      reassignOffers,
      deactivateAndMerge,
    });
    const candidateRepo = makeCandidateRepo({ findById: jest.fn().mockResolvedValue(candidate), updateStatus });
    const executionRepo = makeExecutionRepo({ create: createExecution });
    const service = new MergeExecutorService(candidateRepo, catalogRepo, executionRepo);

    const result = await service.execute("candidate-1", "cto@paraguai.com");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.offersMoved).toBe(3);

    expect(reassignOffers).toHaveBeenCalledWith("source-1", "target-1");
    expect(deactivateAndMerge).toHaveBeenCalledWith("source-1", "target-1");
    expect(createExecution).toHaveBeenCalledWith({
      mergeCandidateId: "candidate-1",
      sourceCanonicalProductId: "source-1",
      targetCanonicalProductId: "target-1",
      movedOfferIds: ["offer-1", "offer-2", "offer-3"],
      executedBy: "cto@paraguai.com",
    });
    expect(updateStatus).toHaveBeenCalledWith("candidate-1", MergeCandidateStatus.Merged, "cto@paraguai.com");
  });

  it("never deletes the source canonical product — only deactivates it", async () => {
    const candidate = makeCandidate({ status: MergeCandidateStatus.Approved });
    const source = makeCanonicalProduct({ id: "source-1" });
    const target = makeCanonicalProduct({ id: "target-1" });
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockImplementation(async (id: string) => (id === "source-1" ? source : target)),
      reassignOffers: jest.fn().mockResolvedValue([]),
    });
    expect(catalogRepo).not.toHaveProperty("delete");

    const service = new MergeExecutorService(
      makeCandidateRepo({ findById: jest.fn().mockResolvedValue(candidate) }),
      catalogRepo,
      makeExecutionRepo()
    );
    await service.execute("candidate-1", null);
    expect(catalogRepo.deactivateAndMerge).toHaveBeenCalled();
  });
});

describe("MergeExecutorService.executeBatch", () => {
  it("processes candidates sequentially and separates successes from failures", async () => {
    const approved = makeCandidate({ id: "a", status: MergeCandidateStatus.Approved, sourceCanonicalProductId: "s1", targetCanonicalProductId: "t1" });
    const pending = makeCandidate({ id: "b", status: MergeCandidateStatus.Pending });

    const source = makeCanonicalProduct({ id: "s1" });
    const target = makeCanonicalProduct({ id: "t1" });

    const candidateRepo = makeCandidateRepo({
      findById: jest.fn().mockImplementation(async (id: string) => (id === "a" ? approved : pending)),
      updateStatus: jest.fn(),
    });
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockImplementation(async (id: string) => (id === "s1" ? source : target)),
      reassignOffers: jest.fn().mockResolvedValue(["offer-1"]),
    });
    const service = new MergeExecutorService(candidateRepo, catalogRepo, makeExecutionRepo());

    const result = await service.executeBatch(["a", "b"], "cto@paraguai.com");

    expect(result.attempted).toBe(2);
    expect(result.succeeded).toHaveLength(1);
    expect(result.failed).toEqual([{ candidateId: "b", error: { code: "CANDIDATE_NOT_APPROVED", message: expect.any(String) } }]);
    expect(result.totalOffersMoved).toBe(1);
  });
});

describe("MergeExecutorService.rollback", () => {
  it("repoints exactly the moved offer ids back to source and reactivates it", async () => {
    const execution = makeExecution({ movedOfferIds: ["offer-1", "offer-2"] });
    const reassignOffersByIds = jest.fn();
    const reactivate = jest.fn();
    const markRolledBack = jest.fn();
    const updateStatus = jest.fn();

    const service = new MergeExecutorService(
      makeCandidateRepo({ updateStatus }),
      makeCatalogRepo({ reassignOffersByIds, reactivate }),
      makeExecutionRepo({ findById: jest.fn().mockResolvedValue(execution), markRolledBack })
    );

    const result = await service.rollback("execution-1", "cto@paraguai.com");

    expect(result.ok).toBe(true);
    expect(reassignOffersByIds).toHaveBeenCalledWith(["offer-1", "offer-2"], "source-1");
    expect(reactivate).toHaveBeenCalledWith("source-1");
    expect(markRolledBack).toHaveBeenCalledWith("execution-1", "cto@paraguai.com");
    expect(updateStatus).toHaveBeenCalledWith("candidate-1", MergeCandidateStatus.RolledBack, "cto@paraguai.com");
  });

  it("refuses to roll back an execution that was already rolled back", async () => {
    const execution = makeExecution({ status: MergeExecutionStatus.RolledBack });
    const reassignOffersByIds = jest.fn();

    const service = new MergeExecutorService(
      makeCandidateRepo(),
      makeCatalogRepo({ reassignOffersByIds }),
      makeExecutionRepo({ findById: jest.fn().mockResolvedValue(execution) })
    );

    const result = await service.rollback("execution-1", "cto@paraguai.com");

    expect(result).toEqual({ ok: false, error: { code: "EXECUTION_ALREADY_ROLLED_BACK", message: expect.any(String) } });
    expect(reassignOffersByIds).not.toHaveBeenCalled();
  });

  it("returns an error when the execution does not exist", async () => {
    const service = new MergeExecutorService(makeCandidateRepo(), makeCatalogRepo(), makeExecutionRepo({ findById: jest.fn().mockResolvedValue(null) }));
    const result = await service.rollback("does-not-exist", null);
    expect(result).toEqual({ ok: false, error: { code: "EXECUTION_NOT_FOUND", message: expect.any(String) } });
  });
});
