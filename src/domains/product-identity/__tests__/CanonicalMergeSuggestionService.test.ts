import { CanonicalMergeSuggestionService } from "../services/CanonicalMergeSuggestionService";
import type { ICanonicalCatalogRepository, CanonicalProduct } from "@/src/domains/canonical-catalog";
import type { IMergeCandidateRepository } from "@/src/domains/canonical-catalog";

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
    ...overrides,
  };
}

function makeCatalogRepo(overrides: Partial<ICanonicalCatalogRepository> = {}): ICanonicalCatalogRepository {
  return {
    findBySlug: jest.fn(),
    findById: jest.fn(),
    findOrCreateBySlug: jest.fn(),
    findByBrandId: jest.fn().mockResolvedValue([]),
    linkOffer: jest.fn(),
    findOffersByCanonicalProductId: jest.fn(),
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

describe("CanonicalMergeSuggestionService", () => {
  it("does nothing when the source canonical product has no brand", async () => {
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockResolvedValue(makeCanonicalProduct({ brandId: null })),
    });
    const mergeCandidateRepo = makeMergeCandidateRepo();
    const service = new CanonicalMergeSuggestionService(catalogRepo, mergeCandidateRepo);

    await service.suggestMergesFor("canonical-1");

    expect(catalogRepo.findByBrandId).not.toHaveBeenCalled();
    expect(mergeCandidateRepo.create).not.toHaveBeenCalled();
  });

  it("does nothing when there are no other canonical products of the same brand", async () => {
    const source = makeCanonicalProduct();
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockResolvedValue(source),
      findByBrandId: jest.fn().mockResolvedValue([source]), // only itself
    });
    const mergeCandidateRepo = makeMergeCandidateRepo();
    const service = new CanonicalMergeSuggestionService(catalogRepo, mergeCandidateRepo);

    await service.suggestMergesFor("canonical-1");

    expect(mergeCandidateRepo.create).not.toHaveBeenCalled();
  });

  it("creates a MergeCandidate for a high-confidence same-brand/category match", async () => {
    const source = makeCanonicalProduct();
    const target = makeCanonicalProduct({
      id: "canonical-2",
      canonicalSlug: "notebook-acer-aspire-3-a315-23-r7ve-outra-loja",
    });
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockResolvedValue(source),
      findByBrandId: jest.fn().mockResolvedValue([source, target]),
    });
    const mergeCandidateRepo = makeMergeCandidateRepo();
    const service = new CanonicalMergeSuggestionService(catalogRepo, mergeCandidateRepo);

    await service.suggestMergesFor("canonical-1");

    expect(mergeCandidateRepo.create).toHaveBeenCalledTimes(1);
    const input = (mergeCandidateRepo.create as jest.Mock).mock.calls[0][0];
    expect(input.sourceCanonicalProductId).toBe("canonical-1");
    expect(input.targetCanonicalProductId).toBe("canonical-2");
    expect(input.confidence).toBeGreaterThanOrEqual(70);
    expect(typeof input.algorithmVersion).toBe("string");
    expect(Array.isArray(input.matchedAttributes)).toBe(true);
    expect(Array.isArray(input.penalties)).toBe(true);
    expect(typeof input.reason).toBe("string");
  });

  it("does not create a MergeCandidate when the best match is below the 'possible' tier", async () => {
    const source = makeCanonicalProduct({
      name: "Notebook Acer Aspire 3",
      specifications: { ram: "8GB" },
    });
    const target = makeCanonicalProduct({
      id: "canonical-2",
      canonicalSlug: "totally-different-product",
      name: "Monitor Dell UltraSharp 27",
      categoryId: "category-monitors",
      specifications: { resolution: "4K" },
    });
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockResolvedValue(source),
      findByBrandId: jest.fn().mockResolvedValue([source, target]),
    });
    const mergeCandidateRepo = makeMergeCandidateRepo();
    const service = new CanonicalMergeSuggestionService(catalogRepo, mergeCandidateRepo);

    await service.suggestMergesFor("canonical-1");

    expect(mergeCandidateRepo.create).not.toHaveBeenCalled();
  });

  it("does not create a duplicate MergeCandidate for a pair that was already suggested", async () => {
    const source = makeCanonicalProduct();
    const target = makeCanonicalProduct({ id: "canonical-2", canonicalSlug: "notebook-acer-aspire-3-a315-23-r7ve-loja-2" });
    const catalogRepo = makeCatalogRepo({
      findById: jest.fn().mockResolvedValue(source),
      findByBrandId: jest.fn().mockResolvedValue([source, target]),
    });
    const mergeCandidateRepo = makeMergeCandidateRepo({
      findByPair: jest.fn().mockResolvedValue({ id: "existing-candidate" }),
    });
    const service = new CanonicalMergeSuggestionService(catalogRepo, mergeCandidateRepo);

    await service.suggestMergesFor("canonical-1");

    expect(mergeCandidateRepo.findByPair).toHaveBeenCalledWith("canonical-1", "canonical-2");
    expect(mergeCandidateRepo.create).not.toHaveBeenCalled();
  });
});
