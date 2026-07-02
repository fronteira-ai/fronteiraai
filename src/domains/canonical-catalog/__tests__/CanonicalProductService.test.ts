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
    findByBrandId: jest.fn(),
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
});
