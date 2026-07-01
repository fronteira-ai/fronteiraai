import { SyncOrchestrator } from "../services/SyncOrchestrator";
import { makeConnectorMetadata, makeRawOffer } from "./helpers";
import type { ICatalogRepository } from "../repositories/ICatalogRepository";
import type { IConnectorRepository } from "../repositories/IConnectorRepository";
import type { ISyncRunRepository } from "../repositories/ISyncRunRepository";
import { SyncRunStatus, ConnectorStatus } from "../types/enums";
import { EventService } from "@/src/domains/trust/services/EventService";
import type { ITrustEventRepository } from "@/src/domains/trust/repositories/ITrustEventRepository";
import type { ProductIdentityService } from "@/src/domains/product-identity/services/ProductIdentityService";

function makeCatalogRepo(): ICatalogRepository {
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
      { skipMedia: true }
    );

    await orchestrator.run(makeConnectorMetadata(), [makeRawOffer()], { dryRun: true });
    expect(recordSpy).not.toHaveBeenCalled();

    recordSpy.mockClear();
    await orchestrator.run(makeConnectorMetadata(), [makeRawOffer()], { dryRun: true, merchantId: "merchant-1" });
    expect(recordSpy).toHaveBeenCalledTimes(2); // started + completed
  });
});
