import { SyncOrchestrator } from "../services/SyncOrchestrator";
import { makeConnectorMetadata, makeRawOffer } from "./helpers";
import type { ICatalogRepository } from "../repositories/ICatalogRepository";
import type { IConnectorRepository } from "../repositories/IConnectorRepository";
import type { ISyncRunRepository } from "../repositories/ISyncRunRepository";
import { SyncRunStatus, ConnectorStatus } from "../types/enums";
import { EventService } from "@/src/domains/trust/services/EventService";
import type { ITrustEventRepository } from "@/src/domains/trust/repositories/ITrustEventRepository";
import type { ProductIdentityService } from "@/src/domains/product-identity/services/ProductIdentityService";
import type { ChangeDetectionService } from "@/src/domains/realtime-commerce/change-detection/ChangeDetectionService";

function makeCatalogRepo(): ICatalogRepository {
  return {
    findProductIdsBySlugs: jest.fn().mockResolvedValue(new Map()),
    findProductById: jest.fn().mockResolvedValue(null),
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
  };
}

function makeConnectorRepo(): IConnectorRepository {
  return {
    upsertFromMetadata: jest.fn().mockResolvedValue({
      id: "connector-1",
      connectorKey: "test-connector",
      name: "Test",
      version: "1.0",
      type: "json-file",
      storeSlug: "test-store",
      description: null,
      status: ConnectorStatus.Active,
      config: {},
      createdAt: "2026-07-01T00:00:00Z",
      updatedAt: "2026-07-01T00:00:00Z",
    }),
    findByKey: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    updateStatus: jest.fn(),
  };
}

function makeSyncRunRepo(): ISyncRunRepository {
  return {
    create: jest.fn().mockResolvedValue({
      id: "run-1",
      connectorId: "connector-1",
      connectorKey: "test-connector",
      merchantId: null,
      batchId: "batch-1",
      dryRun: false,
      status: SyncRunStatus.Running,
      totals: {},
      errors: null,
      startedAt: "2026-07-01T00:00:00Z",
      completedAt: null,
    }),
    update: jest.fn().mockResolvedValue(null),
    findByConnector: jest.fn(),
    findByMerchant: jest.fn(),
  };
}

function makeEventService() {
  const repo: ITrustEventRepository = {
    create: jest.fn().mockResolvedValue(null),
    findByMerchantId: jest.fn(),
    findByType: jest.fn(),
  };
  return new EventService(repo);
}

function makeProductIdentityService(): ProductIdentityService {
  return { evaluateAndLog: jest.fn().mockResolvedValue(undefined) } as unknown as ProductIdentityService;
}

function makeChangeDetectionService(): ChangeDetectionService {
  return { detectAndRecord: jest.fn().mockResolvedValue([]) } as unknown as ChangeDetectionService;
}

describe("SyncOrchestrator", () => {
  it("runs stages in order and persists a connector + sync run", async () => {
    const catalogRepo = makeCatalogRepo();
    const connectorRepo = makeConnectorRepo();
    const syncRunRepo = makeSyncRunRepo();
    const orchestrator = new SyncOrchestrator(
      catalogRepo,
      {} as never,
      connectorRepo,
      syncRunRepo,
      makeEventService(),
      makeProductIdentityService(),
      makeChangeDetectionService(),
      { skipMedia: true }
    );

    const result = await orchestrator.run(makeConnectorMetadata({ id: "test-connector" }), [makeRawOffer()], {
      dryRun: false,
    });

    expect(connectorRepo.upsertFromMetadata).toHaveBeenCalled();
    expect(syncRunRepo.create).toHaveBeenCalled();
    expect(syncRunRepo.update).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({ status: SyncRunStatus.Success })
    );
    expect(result.success).toBe(true);
    expect(result.metrics.stages.map((s) => s.stage)).toEqual([
      "validation",
      "normalization",
      "deduplication",
      "product-identity-shadow",
      "persistence",
      "canonical-link",
      "market-change-detection",
    ]);
  });

  it("skips the media stage when skipMedia is true", async () => {
    const orchestrator = new SyncOrchestrator(
      makeCatalogRepo(),
      {} as never,
      makeConnectorRepo(),
      makeSyncRunRepo(),
      makeEventService(),
      makeProductIdentityService(),
      makeChangeDetectionService(),
      { skipMedia: true }
    );

    const result = await orchestrator.run(makeConnectorMetadata(), [makeRawOffer()], { dryRun: true });

    expect(result.metrics.stages.some((s) => s.stage === "media")).toBe(false);
  });

  it("does not write to the catalog repo in dry-run", async () => {
    const catalogRepo = makeCatalogRepo();
    const orchestrator = new SyncOrchestrator(
      catalogRepo,
      {} as never,
      makeConnectorRepo(),
      makeSyncRunRepo(),
      makeEventService(),
      makeProductIdentityService(),
      makeChangeDetectionService(),
      { skipMedia: true }
    );

    await orchestrator.run(makeConnectorMetadata(), [makeRawOffer()], { dryRun: true });

    expect(catalogRepo.upsertBrand).not.toHaveBeenCalled();
  });

  it("emits Brain events only when a merchantId is provided", async () => {
    const eventService = makeEventService();
    const recordSpy = jest.spyOn(eventService, "recordEvent");
    const orchestrator = new SyncOrchestrator(
      makeCatalogRepo(),
      {} as never,
      makeConnectorRepo(),
      makeSyncRunRepo(),
      eventService,
      makeProductIdentityService(),
      makeChangeDetectionService(),
      { skipMedia: true }
    );

    await orchestrator.run(makeConnectorMetadata(), [makeRawOffer()], { dryRun: true });
    expect(recordSpy).not.toHaveBeenCalled();

    recordSpy.mockClear();
    await orchestrator.run(makeConnectorMetadata(), [makeRawOffer()], { dryRun: true, merchantId: "merchant-1" });
    expect(recordSpy).toHaveBeenCalledTimes(2); // started + completed
  });
});

// Mission Ω-Pipeline (Scalable Connector Architecture). run() is now a thin
// wrapper around runStream() with the whole array as a single batch — these
// exercise the real batching behavior directly: multiple batches from one
// stream, one bad batch never aborting the run, and progress persisted
// after every batch (not just at the end).
describe("SyncOrchestrator.runStream", () => {
  async function* streamOf(items: ReturnType<typeof makeRawOffer>[]) {
    yield* items;
  }

  it("processes a stream in multiple fixed-size batches and sums totals across all of them", async () => {
    const catalogRepo = makeCatalogRepo();
    const syncRunRepo = makeSyncRunRepo();
    const orchestrator = new SyncOrchestrator(
      catalogRepo,
      {} as never,
      makeConnectorRepo(),
      syncRunRepo,
      makeEventService(),
      makeProductIdentityService(),
      makeChangeDetectionService(),
      { skipMedia: true }
    );

    const items = Array.from({ length: 5 }, (_, i) => makeRawOffer({ product: { name: `Product ${i}`, brand: "B", category: "C" } }));
    const result = await orchestrator.runStream(makeConnectorMetadata(), streamOf(items), { dryRun: false, batchSize: 2 });

    expect(result.success).toBe(true);
    expect(result.metrics.totals.received).toBe(5);
    expect(result.metrics.totals.persisted).toBe(5);
    // 3 batches (2, 2, 1) × 7 stages each = 21 stage entries, all recorded.
    expect(result.metrics.stages.length).toBe(21);
    // Progress is persisted after every batch, not only at the end.
    const runningUpdates = (syncRunRepo.update as jest.Mock).mock.calls.filter(
      ([, input]) => input.status === SyncRunStatus.Running
    );
    expect(runningUpdates.length).toBe(3);
  });

  it("never holds more than one batch of raw offers in a single PipelineContext", async () => {
    const catalogRepo = makeCatalogRepo();
    const orchestrator = new SyncOrchestrator(
      catalogRepo,
      {} as never,
      makeConnectorRepo(),
      makeSyncRunRepo(),
      makeEventService(),
      makeProductIdentityService(),
      makeChangeDetectionService(),
      { skipMedia: true }
    );

    // Every stage's `accepted` count (recorded per-batch) must never exceed
    // the batch size (2), even though the full stream has 6 items — proof
    // no single PipelineContext ever saw more than one batch's worth of
    // raw items at once.
    const items = Array.from({ length: 6 }, () => makeRawOffer());
    const result = await orchestrator.runStream(makeConnectorMetadata(), streamOf(items), { dryRun: false, batchSize: 2 });

    expect(result.metrics.totals.received).toBe(6);
    expect(result.metrics.stages.every((s) => s.accepted <= 2)).toBe(true);
  });

  it("records a failing batch as an error and keeps processing subsequent batches", async () => {
    const catalogRepo = makeCatalogRepo();
    (catalogRepo.upsertBrand as jest.Mock)
      .mockRejectedValueOnce(new Error("transient failure"))
      .mockResolvedValue("brand-1");
    const orchestrator = new SyncOrchestrator(
      catalogRepo,
      {} as never,
      makeConnectorRepo(),
      makeSyncRunRepo(),
      makeEventService(),
      makeProductIdentityService(),
      makeChangeDetectionService(),
      { skipMedia: true }
    );

    const items = [makeRawOffer({ product: { name: "A", brand: "B", category: "C" } }), makeRawOffer({ product: { name: "D", brand: "E", category: "F" } })];
    const result = await orchestrator.runStream(makeConnectorMetadata(), streamOf(items), { dryRun: false, batchSize: 1 });

    // First batch's item failed persistence (not a thrown batch-level
    // exception — CatalogWriteStage already catches per-item), second
    // batch still ran and persisted successfully.
    expect(result.metrics.totals.persisted).toBe(1);
    expect(result.metrics.totals.failed).toBe(1);
  });

  it("run() delegates to runStream() as a single batch — identical result shape as before", async () => {
    const orchestrator = new SyncOrchestrator(
      makeCatalogRepo(),
      {} as never,
      makeConnectorRepo(),
      makeSyncRunRepo(),
      makeEventService(),
      makeProductIdentityService(),
      makeChangeDetectionService(),
      { skipMedia: true }
    );

    const result = await orchestrator.run(makeConnectorMetadata(), [makeRawOffer(), makeRawOffer({ product: { name: "B", brand: "B", category: "C" } })], {
      dryRun: false,
    });

    expect(result.metrics.stages.map((s) => s.stage)).toEqual([
      "validation",
      "normalization",
      "deduplication",
      "product-identity-shadow",
      "persistence",
      "canonical-link",
      "market-change-detection",
    ]);
    expect(result.metrics.totals.received).toBe(2);
  });
});
