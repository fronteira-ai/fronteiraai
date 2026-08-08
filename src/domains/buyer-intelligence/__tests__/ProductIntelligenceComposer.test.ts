import { ProductIntelligenceComposer } from "../services/ProductIntelligenceComposer";
import type { ComparisonIntelligenceComposer } from "../services/ComparisonIntelligenceComposer";
import type { ICanonicalCatalogRepository, CanonicalProduct } from "@/src/domains/canonical-catalog";
import { FactType, type LearnedFact, type MarketplaceMemoryService } from "@/src/domains/marketplace-memory";
import type { ComparisonIntelligenceBundle } from "../types/buyer-intelligence.types";

function makeCatalogRepo(overrides: Partial<ICanonicalCatalogRepository> = {}): ICanonicalCatalogRepository {
  return {
    findBySlug: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    findOrCreateBySlug: jest.fn(),
    updateSyncedFields: jest.fn(),
    findByBrandId: jest.fn(),
    findByCategoryId: jest.fn(),
    findCanonicalProductIdByProductId: jest.fn().mockResolvedValue(null),
    findCategorySlugsByIds: jest.fn().mockResolvedValue(new Map()),
    findAll: jest.fn(),
    linkOffer: jest.fn(),
    findOffersByCanonicalProductId: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    findOfferIdsByCanonicalProductId: jest.fn(),
    reassignOffers: jest.fn(),
    reassignOffersByIds: jest.fn(),
    deactivateAndMerge: jest.fn(),
    reactivate: jest.fn(),
    ...overrides,
  };
}

function makeCanonicalProduct(overrides: Partial<CanonicalProduct> = {}): CanonicalProduct {
  return {
    id: "canonical-1",
    canonicalSlug: "iphone-15-pro",
    name: "iPhone 15 Pro",
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

function makeFact(): LearnedFact {
  return {
    id: "fact-1",
    canonicalProductId: "canonical-1",
    factType: FactType.Color,
    factValue: "Preto",
    confidence: "high",
    source: "specifications",
    extractedFrom: null,
    merchantId: "store-1",
    origin: "backfill",
    validationStatus: "unvalidated",
    algorithmVersion: "1.0.0",
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
  };
}

describe("ProductIntelligenceComposer", () => {
  it("returns an empty bundle with no facts when there is no canonical link yet (Shadow Mode)", async () => {
    const catalogRepo = makeCatalogRepo();
    const comparisonComposer = { composeForSlug: jest.fn() } as unknown as ComparisonIntelligenceComposer;
    const marketplaceMemoryService = { getFactsForProduct: jest.fn() } as unknown as MarketplaceMemoryService;

    const composer = new ProductIntelligenceComposer(catalogRepo, comparisonComposer, marketplaceMemoryService);
    const result = await composer.composeForProduct("product-1");

    expect(result).toEqual({ comparison: null, facts: [] });
    expect(marketplaceMemoryService.getFactsForProduct).not.toHaveBeenCalled();
  });

  it("fetches facts as soon as the canonical link resolves, even if comparison ends up null", async () => {
    const facts = [makeFact()];
    const catalogRepo = makeCatalogRepo({
      findCanonicalProductIdByProductId: jest.fn().mockResolvedValue("canonical-1"),
      findById: jest.fn().mockResolvedValue(null),
    });
    const comparisonComposer = { composeForSlug: jest.fn() } as unknown as ComparisonIntelligenceComposer;
    const marketplaceMemoryService = { getFactsForProduct: jest.fn().mockResolvedValue(facts) } as unknown as MarketplaceMemoryService;

    const composer = new ProductIntelligenceComposer(catalogRepo, comparisonComposer, marketplaceMemoryService);
    const result = await composer.composeForProduct("product-1");

    expect(result).toEqual({ comparison: null, facts });
    expect(comparisonComposer.composeForSlug).not.toHaveBeenCalled();
  });

  it("returns both comparison and facts together when everything resolves", async () => {
    const facts = [makeFact()];
    const canonicalProduct = makeCanonicalProduct();
    const comparisonBundle = { canonicalProduct } as unknown as ComparisonIntelligenceBundle;
    const catalogRepo = makeCatalogRepo({
      findCanonicalProductIdByProductId: jest.fn().mockResolvedValue("canonical-1"),
      findById: jest.fn().mockResolvedValue(canonicalProduct),
    });
    const comparisonComposer = {
      composeForSlug: jest.fn().mockResolvedValue(comparisonBundle),
    } as unknown as ComparisonIntelligenceComposer;
    const marketplaceMemoryService = { getFactsForProduct: jest.fn().mockResolvedValue(facts) } as unknown as MarketplaceMemoryService;

    const composer = new ProductIntelligenceComposer(catalogRepo, comparisonComposer, marketplaceMemoryService);
    const result = await composer.composeForProduct("product-1");

    expect(comparisonComposer.composeForSlug).toHaveBeenCalledWith("iphone-15-pro");
    expect(result).toEqual({ comparison: comparisonBundle, facts });
  });
});
