import { CanonicalProductService } from "../services/CanonicalProductService";
import type { ICanonicalCatalogRepository } from "../repositories/ICanonicalCatalogRepository";
import type { CanonicalProduct } from "../domain/CanonicalProduct";

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
    ...overrides,
  };
}

function makeRepo(overrides: Partial<ICanonicalCatalogRepository> = {}): ICanonicalCatalogRepository {
  return {
    findBySlug: jest.fn().mockResolvedValue(null),
    findById: jest.fn(),
    findOrCreateBySlug: jest.fn(),
    updateSyncedFields: jest.fn(),
    findByBrandId: jest.fn(),
    findByCategoryId: jest.fn(),
    findCanonicalProductIdByProductId: jest.fn(),
    findAll: jest.fn(),
    linkOffer: jest.fn(),
    findOffersByCanonicalProductId: jest.fn(),
    ...overrides,
  };
}

describe("CanonicalProductService", () => {
  it("bootstrapFromProduct reuses the product's own slug as canonical_slug (1:1, lossless)", async () => {
    const canonicalProduct = makeCanonicalProduct();
    const findOrCreateBySlug = jest.fn().mockResolvedValue(canonicalProduct);
    const repo = makeRepo({ findOrCreateBySlug });
    const service = new CanonicalProductService(repo);

    const result = await service.bootstrapFromProduct({
      slug: "iphone-15-pro",
      name: "iPhone 15 Pro",
      brandId: "brand-1",
      categoryId: "category-1",
      imageUrl: null,
      specifications: null,
    });

    expect(findOrCreateBySlug).toHaveBeenCalledWith("iphone-15-pro", {
      canonicalSlug: "iphone-15-pro",
      name: "iPhone 15 Pro",
      brandId: "brand-1",
      categoryId: "category-1",
      imageUrl: null,
      specifications: null,
    });
    expect(result).toBe(canonicalProduct);
  });

  it("bootstrapFromProduct is idempotent — calling it twice returns the same canonical product", async () => {
    const canonicalProduct = makeCanonicalProduct();
    const findOrCreateBySlug = jest.fn().mockResolvedValue(canonicalProduct);
    const repo = makeRepo({ findOrCreateBySlug });
    const service = new CanonicalProductService(repo);

    const input = {
      slug: "iphone-15-pro",
      name: "iPhone 15 Pro",
      brandId: "brand-1",
      categoryId: "category-1",
      imageUrl: null,
      specifications: null,
    };

    const first = await service.bootstrapFromProduct(input);
    const second = await service.bootstrapFromProduct(input);

    expect(first).toEqual(second);
    expect(findOrCreateBySlug).toHaveBeenCalledTimes(2);
  });

  it("getBySlug delegates to the repository", async () => {
    const canonicalProduct = makeCanonicalProduct();
    const findBySlug = jest.fn().mockResolvedValue(canonicalProduct);
    const service = new CanonicalProductService(makeRepo({ findBySlug }));

    const result = await service.getBySlug("iphone-15-pro");

    expect(findBySlug).toHaveBeenCalledWith("iphone-15-pro");
    expect(result).toBe(canonicalProduct);
  });

  it("generateCanonicalSlug returns the base slug when there's no collision", async () => {
    const service = new CanonicalProductService(makeRepo({ findBySlug: jest.fn().mockResolvedValue(null) }));
    const slug = await service.generateCanonicalSlug("iPhone 15 Pro", "apple");
    expect(slug).toBe("apple-iphone-15-pro");
  });

  it("generateCanonicalSlug appends a numeric suffix on collision", async () => {
    const findBySlug = jest
      .fn()
      .mockResolvedValueOnce(makeCanonicalProduct({ canonicalSlug: "apple-iphone-15-pro" }))
      .mockResolvedValueOnce(makeCanonicalProduct({ canonicalSlug: "apple-iphone-15-pro-2" }))
      .mockResolvedValueOnce(null);

    const service = new CanonicalProductService(makeRepo({ findBySlug }));
    const slug = await service.generateCanonicalSlug("iPhone 15 Pro", "apple");

    expect(slug).toBe("apple-iphone-15-pro-3");
  });

  describe("diffFromProduct (Fase 2 — Sprint 2.8)", () => {
    it("returns no drift when the canonical product already matches its source product", () => {
      const service = new CanonicalProductService(makeRepo());
      const canonical = makeCanonicalProduct({ specifications: { color: "black" } });

      const drifts = service.diffFromProduct(canonical, {
        slug: "iphone-15-pro",
        name: "iPhone 15 Pro",
        brandId: "brand-1",
        categoryId: "category-1",
        imageUrl: null,
        specifications: { color: "black" },
      });

      expect(drifts).toEqual([]);
    });

    it("detects specifications drift regardless of key order", () => {
      const service = new CanonicalProductService(makeRepo());
      const canonical = makeCanonicalProduct({ specifications: { color: "black", storage: "256GB" } });

      const drifts = service.diffFromProduct(canonical, {
        slug: "iphone-15-pro",
        name: "iPhone 15 Pro",
        brandId: "brand-1",
        categoryId: "category-1",
        imageUrl: null,
        specifications: { storage: "256GB", color: "black" },
      });

      expect(drifts).toEqual([]);
    });

    it("detects a canonical product with stale (empty) specifications versus an enriched product", () => {
      const service = new CanonicalProductService(makeRepo());
      const canonical = makeCanonicalProduct({ specifications: {} });

      const drifts = service.diffFromProduct(canonical, {
        slug: "iphone-15-pro",
        name: "iPhone 15 Pro",
        brandId: "brand-1",
        categoryId: "category-1",
        imageUrl: null,
        specifications: { color: "black", storage: "256GB" },
      });

      expect(drifts).toEqual([
        { field: "specifications", from: {}, to: { color: "black", storage: "256GB" } },
      ]);
    });

    it("detects categoryId, brandId and imageUrl drift independently", () => {
      const service = new CanonicalProductService(makeRepo());
      const canonical = makeCanonicalProduct({
        categoryId: "category-old",
        brandId: "brand-old",
        imageUrl: "https://old.example/img.jpg",
      });

      const drifts = service.diffFromProduct(canonical, {
        slug: "iphone-15-pro",
        name: "iPhone 15 Pro",
        brandId: "brand-new",
        categoryId: "category-new",
        imageUrl: "https://new.example/img.jpg",
        specifications: null,
      });

      expect(drifts.map((d) => d.field).sort()).toEqual(["brandId", "categoryId", "imageUrl"]);
    });
  });

  describe("syncFromProduct (Fase 2 — Sprint 2.8)", () => {
    it("does not call the repository when there is no drift", async () => {
      const updateSyncedFields = jest.fn();
      const service = new CanonicalProductService(makeRepo({ updateSyncedFields }));
      const canonical = makeCanonicalProduct({ specifications: { color: "black" } });

      const result = await service.syncFromProduct(canonical, {
        slug: "iphone-15-pro",
        name: "iPhone 15 Pro",
        brandId: "brand-1",
        categoryId: "category-1",
        imageUrl: null,
        specifications: { color: "black" },
      });

      expect(result).toEqual({ updated: false, drifts: [] });
      expect(updateSyncedFields).not.toHaveBeenCalled();
    });

    it("writes only the synced fields (never canonicalSlug or name) when drift is found", async () => {
      const updateSyncedFields = jest.fn().mockResolvedValue(makeCanonicalProduct());
      const service = new CanonicalProductService(makeRepo({ updateSyncedFields }));
      const canonical = makeCanonicalProduct({ specifications: {} });

      const result = await service.syncFromProduct(canonical, {
        slug: "iphone-15-pro",
        name: "iPhone 15 Pro (renamed)",
        brandId: "brand-1",
        categoryId: "category-1",
        imageUrl: null,
        specifications: { color: "black" },
      });

      expect(result.updated).toBe(true);
      expect(result.drifts).toEqual([{ field: "specifications", from: {}, to: { color: "black" } }]);
      expect(updateSyncedFields).toHaveBeenCalledWith("canonical-1", {
        specifications: { color: "black" },
        categoryId: "category-1",
        brandId: "brand-1",
        imageUrl: null,
      });
    });
  });
});
