import { decideBrand, decideCategory, evaluateCandidate } from "../services/CatalogRecoveryEngine";
import type { RecoveryDependencies, CatalogEntryLookup } from "../services/CatalogRecoveryEngine";
import type { RecoveryCandidateRow, ConfirmedAttributes } from "../repositories/IRecoveryRepository";

function makeCandidate(overrides: Partial<RecoveryCandidateRow> = {}): RecoveryCandidateRow {
  return {
    productId: "product-1",
    storeId: "store-1",
    name: "Some Product",
    specifications: null,
    brandId: "brand-junk",
    brandName: "Outros",
    categoryId: "category-junk",
    categoryName: "GENERAL",
    ...overrides,
  };
}

function makeDeps(overrides: Partial<RecoveryDependencies> = {}): RecoveryDependencies {
  return {
    findConfirmedByIdentifier: jest.fn().mockResolvedValue(null),
    findCanonicalLinkAttributes: jest.fn().mockResolvedValue(null),
    findLearnedCorrection: jest.fn().mockResolvedValue(null),
    findBrandByNormalizedName: jest.fn().mockResolvedValue(null),
    findCategoryByNormalizedName: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("CatalogRecoveryEngine.decideBrand", () => {
  it("Camada 1 (ProductSignature) — recovers from a confirmed EAN/MPN match on another product", async () => {
    const identifierMatch: ConfirmedAttributes = { brandId: "brand-1", brandName: "Apple", categoryId: null, categoryName: null };
    const deps = makeDeps();
    const result = await decideBrand(makeCandidate(), identifierMatch, null, deps);
    expect(result).toEqual(expect.objectContaining({ outcome: "recovered", value: "Apple", layer: "product_signature" }));
  });

  it("never trusts an identifier match that itself resolves to a forbidden/generic brand", async () => {
    const identifierMatch: ConfirmedAttributes = { brandId: "brand-junk-2", brandName: "Outros", categoryId: null, categoryName: null };
    const deps = makeDeps();
    const result = await decideBrand(makeCandidate(), identifierMatch, null, deps);
    expect(result.outcome).toBe("pending");
    if (result.outcome === "pending") {
      expect(result.reasons.some((r) => r.startsWith("rejected-forbidden"))).toBe(true);
    }
  });

  it("Camada 2 (Canonical Catalog) — recovers from this product's own linked canonical product", async () => {
    const canonicalMatch: ConfirmedAttributes = { brandId: "brand-2", brandName: "Samsung", categoryId: null, categoryName: null };
    const deps = makeDeps();
    const result = await decideBrand(makeCandidate(), null, canonicalMatch, deps);
    expect(result).toEqual(expect.objectContaining({ outcome: "recovered", value: "Samsung", layer: "canonical_catalog" }));
  });

  it("detects a real conflict when ProductSignature and Canonical Catalog disagree — never picks one arbitrarily", async () => {
    const identifierMatch: ConfirmedAttributes = { brandId: "brand-1", brandName: "Apple", categoryId: null, categoryName: null };
    const canonicalMatch: ConfirmedAttributes = { brandId: "brand-2", brandName: "Samsung", categoryId: null, categoryName: null };
    const deps = makeDeps();
    const result = await decideBrand(makeCandidate(), identifierMatch, canonicalMatch, deps);
    expect(result.outcome).toBe("pending");
    if (result.outcome === "pending") {
      expect(result.conflict).toEqual({ layers: ["product_signature", "canonical_catalog"], values: ["Apple", "Samsung"] });
    }
  });

  it("agreement between layers (same brand id) is not a conflict — recovers normally", async () => {
    const identifierMatch: ConfirmedAttributes = { brandId: "brand-1", brandName: "Apple", categoryId: null, categoryName: null };
    const canonicalMatch: ConfirmedAttributes = { brandId: "brand-1", brandName: "Apple", categoryId: null, categoryName: null };
    const deps = makeDeps();
    const result = await decideBrand(makeCandidate(), identifierMatch, canonicalMatch, deps);
    expect(result).toEqual(expect.objectContaining({ outcome: "recovered", value: "Apple" }));
  });

  it("Camada 3 (Merchant Memory) — recovers via a previously learned store correction", async () => {
    const deps = makeDeps({
      findLearnedCorrection: jest.fn().mockResolvedValue("Apple"),
      findBrandByNormalizedName: jest.fn().mockResolvedValue({ id: "brand-1", name: "Apple" } as CatalogEntryLookup),
    });
    const result = await decideBrand(makeCandidate({ brandName: "Apple Inc" }), null, null, deps);
    expect(result).toEqual(expect.objectContaining({ outcome: "recovered", value: "Apple", layer: "merchant_memory" }));
  });

  it("goes to pending with real reasons when no layer confirms anything", async () => {
    const deps = makeDeps();
    const result = await decideBrand(makeCandidate(), null, null, deps);
    expect(result.outcome).toBe("pending");
    if (result.outcome === "pending") {
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.conflict).toBeUndefined();
    }
  });
});

describe("CatalogRecoveryEngine.decideCategory", () => {
  it("Camada 1 — recovers category from a confirmed identifier match", async () => {
    const identifierMatch: ConfirmedAttributes = { brandId: null, brandName: null, categoryId: "cat-1", categoryName: "Celulares e Smartphones" };
    const result = await decideCategory(makeCandidate(), identifierMatch, null, makeDeps());
    expect(result).toEqual(expect.objectContaining({ outcome: "recovered", value: "Celulares e Smartphones", layer: "product_signature" }));
  });

  it("Camada 4 (Universal Taxonomy) — resolves real (non-forbidden) category text to an existing category", async () => {
    const deps = makeDeps({
      findCategoryByNormalizedName: jest.fn().mockResolvedValue({ id: "cat-1", name: "Celulares e Smartphones" }),
    });
    const result = await decideCategory(makeCandidate({ categoryName: "smartphones", categoryId: null }), null, null, deps);
    expect(result).toEqual(expect.objectContaining({ outcome: "recovered", value: "Celulares e Smartphones", layer: "universal_taxonomy" }));
  });

  it("never recovers from forbidden category text via Universal Taxonomy", async () => {
    const deps = makeDeps({ findCategoryByNormalizedName: jest.fn().mockResolvedValue({ id: "cat-junk", name: "GENERAL" }) });
    const result = await decideCategory(makeCandidate({ categoryName: "GENERAL" }), null, null, deps);
    expect(result.outcome).toBe("pending");
  });

  it("detects a real conflict between ProductSignature and Canonical Catalog for category too", async () => {
    const identifierMatch: ConfirmedAttributes = { brandId: null, brandName: null, categoryId: "cat-1", categoryName: "Notebooks" };
    const canonicalMatch: ConfirmedAttributes = { brandId: null, brandName: null, categoryId: "cat-2", categoryName: "Celulares e Smartphones" };
    const result = await decideCategory(makeCandidate(), identifierMatch, canonicalMatch, makeDeps());
    expect(result.outcome).toBe("pending");
    if (result.outcome === "pending") {
      expect(result.conflict?.layers).toEqual(["product_signature", "canonical_catalog"]);
    }
  });
});

describe("CatalogRecoveryEngine.evaluateCandidate", () => {
  it("skips both fields entirely when the product is already fully confirmed", async () => {
    const candidate = makeCandidate({ brandId: "brand-1", brandName: "Apple", categoryId: "cat-1", categoryName: "Celulares e Smartphones" });
    const deps = makeDeps();
    const result = await evaluateCandidate(candidate, deps);
    expect(result.needsBrand).toBe(false);
    expect(result.needsCategory).toBe(false);
    expect(result.brand).toBeNull();
    expect(result.category).toBeNull();
    expect(deps.findCanonicalLinkAttributes).not.toHaveBeenCalled();
  });

  it("evaluates only the field that actually needs recovery", async () => {
    const candidate = makeCandidate({ brandId: "brand-1", brandName: "Apple", categoryId: null, categoryName: null });
    const deps = makeDeps();
    const result = await evaluateCandidate(candidate, deps);
    expect(result.needsBrand).toBe(false);
    expect(result.needsCategory).toBe(true);
    expect(result.brand).toBeNull();
    expect(result.category).not.toBeNull();
  });
});
