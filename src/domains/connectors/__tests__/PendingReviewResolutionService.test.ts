import { PendingReviewResolutionService } from "../services/PendingReviewResolutionService";
import type { ICatalogRepository, PendingReviewRecord } from "../repositories/ICatalogRepository";
import { makeNormalizedOffer } from "./helpers";
import type { MarketplaceMemoryService } from "@/src/domains/marketplace-memory";

function makeCatalogRepo(overrides: Partial<ICatalogRepository> = {}): ICatalogRepository {
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
    ...overrides,
  };
}

function makeReview(overrides: Partial<PendingReviewRecord> = {}): PendingReviewRecord {
  return {
    id: "review-1",
    productId: null,
    storeId: "store-1",
    fieldType: "brand",
    rawValue: "Notebook Gamer",
    reasons: ["no learned correction on file"],
    payload: makeNormalizedOffer(),
    status: "pending",
    createdAt: "2026-07-22T00:00:00Z",
    ...overrides,
  };
}

function makeMarketplaceMemoryService(): MarketplaceMemoryService {
  return { observePattern: jest.fn().mockResolvedValue(undefined) } as unknown as MarketplaceMemoryService;
}

describe("PendingReviewResolutionService", () => {
  it("records the correction into MerchantAttributePattern for future auto-reapplication", async () => {
    const marketplaceMemoryService = makeMarketplaceMemoryService();
    const service = new PendingReviewResolutionService(makeCatalogRepo(), marketplaceMemoryService);

    await service.resolve(makeReview(), "Notebook", "operator-1");

    expect(marketplaceMemoryService.observePattern).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: "store-1", rawKey: "Notebook Gamer", concept: "brand", resolvedValue: "Notebook" })
    );
  });

  it("completes the write using the confirmed value and the payload captured at block time", async () => {
    const catalogRepo = makeCatalogRepo();
    const service = new PendingReviewResolutionService(catalogRepo, makeMarketplaceMemoryService());

    await service.resolve(makeReview(), "Notebook", "operator-1");

    expect(catalogRepo.upsertBrand).toHaveBeenCalledWith("Notebook", "notebook");
    expect(catalogRepo.upsertProduct).toHaveBeenCalled();
    expect(catalogRepo.upsertOffer).toHaveBeenCalled();
    expect(catalogRepo.resolvePendingReview).toHaveBeenCalledWith("review-1", expect.objectContaining({ resolvedValue: "Notebook" }));
  });

  it("resolves every other pending review for the identical (store, field, raw value) in the same pass", async () => {
    const duplicate = makeReview({ id: "review-2" });
    const catalogRepo = makeCatalogRepo({
      findPendingReviewsByStoreFieldValue: jest.fn().mockResolvedValue([duplicate]),
    });
    const service = new PendingReviewResolutionService(catalogRepo, makeMarketplaceMemoryService());

    await service.resolve(makeReview(), "Notebook", "operator-1");

    expect(catalogRepo.resolvePendingReview).toHaveBeenCalledWith("review-1", expect.anything());
    expect(catalogRepo.resolvePendingReview).toHaveBeenCalledWith("review-2", expect.anything());
  });

  it("never blocks on a missing MarketplaceMemoryService (best-effort learning)", async () => {
    const catalogRepo = makeCatalogRepo();
    const service = new PendingReviewResolutionService(catalogRepo, null);

    await expect(service.resolve(makeReview(), "Notebook", "operator-1")).resolves.not.toThrow();
    expect(catalogRepo.resolvePendingReview).toHaveBeenCalled();
  });
});
