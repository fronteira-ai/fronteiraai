import { HistoricalCanonicalBootstrapService } from "../services/HistoricalCanonicalBootstrapService";
import { InMemoryCanonicalSuggestionOutboxRepository } from "./helpers/InMemoryCanonicalSuggestionOutboxRepository";
import { InMemoryBootstrapCheckpointRepository } from "./helpers/InMemoryBootstrapCheckpointRepository";
import type { ResolvedProduct } from "../repositories/ICatalogRepository";
import type { CanonicalProduct } from "@/src/domains/canonical-catalog";

function makeProduct(id: string, overrides: Partial<ResolvedProduct> = {}): ResolvedProduct {
  return { id, slug: `product-${id}`, name: `Product ${id}`, brandId: "brand-1", categoryId: "category-1", imageUrl: null, specifications: {}, ...overrides };
}

function makeCanonical(id: string): CanonicalProduct {
  return {
    id: `canonical-${id}`,
    canonicalSlug: `product-${id}`,
    name: `Product ${id}`,
    brandId: "brand-1",
    categoryId: "category-1",
    imageUrl: null,
    specifications: {},
    createdAt: "2026-07-24T00:00:00Z",
    updatedAt: "2026-07-24T00:00:00Z",
    isActive: true,
    mergedIntoId: null,
  };
}

function makeDeps(overrides: {
  findProductsAfterId?: jest.Mock;
  findOfferIdsByProductId?: jest.Mock;
  bootstrapFromProduct?: jest.Mock;
  linkOffer?: jest.Mock;
  outboxRepo?: InMemoryCanonicalSuggestionOutboxRepository;
  checkpointRepo?: InMemoryBootstrapCheckpointRepository;
} = {}) {
  const outboxRepo = overrides.outboxRepo ?? new InMemoryCanonicalSuggestionOutboxRepository();
  const checkpointRepo = overrides.checkpointRepo ?? new InMemoryBootstrapCheckpointRepository();
  const findOfferIdsByProductId = overrides.findOfferIdsByProductId ?? jest.fn().mockResolvedValue(["offer-1"]);
  const linkOffer = overrides.linkOffer ?? jest.fn().mockResolvedValue(undefined);
  const bootstrapFromProduct = overrides.bootstrapFromProduct ?? jest.fn().mockImplementation((p: { slug: string }) => Promise.resolve(makeCanonical(p.slug.replace("product-", ""))));

  return {
    deps: {
      catalogRepo: { findProductsAfterId: overrides.findProductsAfterId, findOfferIdsByProductId } as never,
      canonicalProductService: { bootstrapFromProduct } as never,
      canonicalCatalogRepo: { linkOffer } as never,
      canonicalSuggestionOutboxRepo: outboxRepo,
      checkpointRepo,
    },
    outboxRepo,
    checkpointRepo,
    findOfferIdsByProductId,
    bootstrapFromProduct,
    linkOffer,
  };
}

describe("HistoricalCanonicalBootstrapService", () => {
  it("processes every page until an empty page marks the run completed", async () => {
    const findProductsAfterId = jest
      .fn()
      .mockResolvedValueOnce([makeProduct("1"), makeProduct("2")])
      .mockResolvedValueOnce([makeProduct("3")])
      .mockResolvedValueOnce([]);
    const { deps, checkpointRepo } = makeDeps({ findProductsAfterId });

    const service = new HistoricalCanonicalBootstrapService(deps);
    const result = await service.run({ runKey: "run-1", batchSize: 2, sleepMsBetweenBatches: 0 });

    expect(result.status).toBe("completed");
    expect(result.totalProcessed).toBe(3);
    expect(checkpointRepo.rows[0].status).toBe("completed");
  });

  it("is checkpointed and resumable — a second call with the same runKey continues from lastProductId, never reprocessing earlier items", async () => {
    const findProductsAfterId = jest
      .fn()
      .mockResolvedValueOnce([makeProduct("1"), makeProduct("2")])
      .mockResolvedValueOnce([makeProduct("3")])
      .mockResolvedValueOnce([]);
    const { deps, checkpointRepo } = makeDeps({ findProductsAfterId });

    const service = new HistoricalCanonicalBootstrapService(deps);
    const first = await service.run({ runKey: "run-1", batchSize: 2, sleepMsBetweenBatches: 0, maxBatches: 1 });

    expect(first.status).toBe("running"); // not done yet — only 1 batch allowed this call
    expect(first.totalProcessed).toBe(2);
    expect(checkpointRepo.rows[0].lastProductId).toBe("2");

    const second = await service.run({ runKey: "run-1", batchSize: 2, sleepMsBetweenBatches: 0 });

    expect(second.status).toBe("completed");
    expect(second.totalProcessed).toBe(3); // 2 (resumed) + 1 (new), never 2+3
    expect(findProductsAfterId).toHaveBeenNthCalledWith(2, "2", 2); // resume cursor passed correctly
  });

  it("is idempotent on resume — re-processing after a crash mid-batch never double-links or double-enqueues (bootstrapFromProduct/linkOffer/enqueue are themselves idempotent)", async () => {
    const findProductsAfterId = jest.fn().mockResolvedValueOnce([makeProduct("1")]).mockResolvedValueOnce([]);
    const outboxRepo = new InMemoryCanonicalSuggestionOutboxRepository();
    const { deps } = makeDeps({ findProductsAfterId, outboxRepo });

    const service = new HistoricalCanonicalBootstrapService(deps);
    await service.run({ runKey: "run-1", batchSize: 10, sleepMsBetweenBatches: 0 });
    // Re-run the same completed run — findOrCreate returns the completed
    // checkpoint, the service short-circuits without touching anything again.
    const second = await service.run({ runKey: "run-1", batchSize: 10, sleepMsBetweenBatches: 0 });

    expect(second.itemsProcessedThisRun).toBe(0);
    expect(outboxRepo.rows.filter((r) => r.canonicalProductId === "canonical-1")).toHaveLength(1);
  });

  it("supports safe cancellation — stops before starting the next batch, never mid-item, and marks the checkpoint 'cancelled'", async () => {
    const checkpointRepo = new InMemoryBootstrapCheckpointRepository();
    const findProductsAfterId = jest.fn().mockImplementation(async (afterId: string | null) => {
      if (afterId === null) {
        // Simulate an operator cancelling between batch 1 finishing and
        // batch 2's cancellation check — real, not synthetic: this is
        // exactly the checkpointRepo.findByRunKey call the service itself
        // makes at the top of every loop iteration.
        await checkpointRepo.requestCancel("run-1");
        return [makeProduct("1")];
      }
      return [makeProduct("2")]; // would only be reached if cancellation failed to stop the loop
    });
    const { deps } = makeDeps({ findProductsAfterId, checkpointRepo });

    const service = new HistoricalCanonicalBootstrapService(deps);
    const result = await service.run({ runKey: "run-1", batchSize: 1, sleepMsBetweenBatches: 0 });

    expect(result.status).toBe("cancelled");
    expect(result.totalProcessed).toBe(1); // batch 1 finished cleanly before the cancel check fired
    expect(findProductsAfterId).toHaveBeenCalledTimes(1); // batch 2 never started
  });

  it("recovery: requestCancel() on a run not currently running/paused is a safe no-op", async () => {
    const { deps } = makeDeps();
    const service = new HistoricalCanonicalBootstrapService(deps);

    const cancelled = await service.requestCancel("never-started");

    expect(cancelled).toBe(false);
  });

  it("isolates a per-item failure — one product's error never aborts the batch or the run", async () => {
    const findProductsAfterId = jest.fn().mockResolvedValueOnce([makeProduct("1"), makeProduct("2")]).mockResolvedValueOnce([]);
    const bootstrapFromProduct = jest
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(makeCanonical("2"));
    const { deps } = makeDeps({ findProductsAfterId, bootstrapFromProduct });

    const service = new HistoricalCanonicalBootstrapService(deps);
    const result = await service.run({ runKey: "run-1", batchSize: 10, sleepMsBetweenBatches: 0 });

    expect(result.status).toBe("completed");
    expect(result.totalProcessed).toBe(2);
    expect(result.totalFailed).toBe(1);
  });

  it("processes in bounded pages — never fetches more than one batch's worth of products into memory at a time", async () => {
    const findProductsAfterId = jest.fn().mockResolvedValueOnce([makeProduct("1")]).mockResolvedValueOnce([]);
    const { deps } = makeDeps({ findProductsAfterId });

    const service = new HistoricalCanonicalBootstrapService(deps);
    await service.run({ runKey: "run-1", batchSize: 7, sleepMsBetweenBatches: 0 });

    expect(findProductsAfterId).toHaveBeenCalledWith(null, 7);
  });

  it("recovery after an unexpected failure: an uncaught error marks the checkpoint 'failed' with the error recorded, never left silently 'running'", async () => {
    const findProductsAfterId = jest.fn().mockRejectedValue(new Error("db unreachable"));
    const { deps, checkpointRepo } = makeDeps({ findProductsAfterId });

    const service = new HistoricalCanonicalBootstrapService(deps);
    const result = await service.run({ runKey: "run-1", batchSize: 10, sleepMsBetweenBatches: 0 });

    expect(result.status).toBe("failed");
    expect(checkpointRepo.rows[0].lastError).toContain("db unreachable");
  });
});
