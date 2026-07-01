import { ProductIdentityEngine } from "../domain/ProductIdentityEngine";
import { ConfidenceTier, MatchStrategy, PRODUCT_IDENTITY_ALGORITHM_VERSION } from "../types/enums";
import type { EvaluableProduct, MatchCandidate } from "../types/product-identity.types";

function makeOffer(overrides: Partial<EvaluableProduct> = {}): EvaluableProduct {
  return {
    slug: "notebook-acer-aspire-3-a315-23-r7ve",
    name: "Notebook Acer Aspire 3 A315-23-R7VE",
    brandSlug: "acer",
    categorySlug: "notebooks",
    specifications: { ram: "8GB", storage: "256GB SSD" },
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    productId: "product-1",
    slug: "notebook-acer-aspire-3-a315-23-r7ve-loja-2",
    name: "Notebook Acer Aspire 3 A315-23-R7VE",
    brandSlug: "acer",
    categorySlug: "notebooks",
    specifications: { ram: "8GB", storage: "256GB SSD" },
    ...overrides,
  };
}

describe("ProductIdentityEngine", () => {
  const engine = new ProductIdentityEngine();

  it("returns a certain Auto match via exact slug, without scoring", () => {
    const offer = makeOffer();
    const candidate = makeCandidate({ slug: offer.slug });
    const result = engine.evaluate(offer, [candidate, makeCandidate({ productId: "product-2", slug: "other" })]);

    expect(result.strategy).toBe(MatchStrategy.ExactSlug);
    expect(result.tier).toBe(ConfidenceTier.Auto);
    expect(result.confidence).toBe(100);
    expect(result.candidateProductId).toBe(candidate.productId);
    expect(result.suggestedDecision).toBe("auto-merge");
    expect(result.algorithmVersion).toBe(PRODUCT_IDENTITY_ALGORITHM_VERSION);
    expect(result.matchedAttributes).toEqual(["slug"]);
    expect(result.mismatchedAttributes).toEqual([]);
    expect(result.penalties).toEqual([]);
    expect(result.explainabilityReason.length).toBeGreaterThan(0);
  });

  it("true positive: same brand/category and near-identical name/specs score into a mergeable tier", () => {
    const offer = makeOffer();
    const candidate = makeCandidate();
    const result = engine.evaluate(offer, [candidate]);

    expect(result.strategy).toBe(MatchStrategy.FuzzyAttribute);
    expect(result.confidence).toBeGreaterThanOrEqual(95);
    expect(result.tier).toBe(ConfidenceTier.Auto);
    expect(result.suggestedDecision).toBe("auto-merge");
    expect(result.candidateProductId).toBe(candidate.productId);

    const brandFactor = result.factors.find((f) => f.factor === "brand");
    const categoryFactor = result.factors.find((f) => f.factor === "category");
    expect(brandFactor?.matched).toBe(true);
    expect(categoryFactor?.matched).toBe(true);

    expect(result.algorithmVersion).toBe(PRODUCT_IDENTITY_ALGORITHM_VERSION);
    expect(result.matchedAttributes).toEqual(expect.arrayContaining(["brand", "category"]));
    expect(result.penalties).toEqual([]);
    expect(result.explainabilityReason).toContain("auto");
  });

  it("false-positive guard: same brand/category but a different storage capacity never reaches a mergeable tier", () => {
    const offer = makeOffer({
      slug: "iphone-15-pro-128gb-titanio",
      name: "iPhone 15 Pro 128GB Titanio",
      brandSlug: "apple",
      categorySlug: "celulares",
      specifications: { storage: "128GB", color: "Titanio" },
    });
    const candidate = makeCandidate({
      productId: "product-iphone-256",
      slug: "iphone-15-pro-256gb-titanio",
      name: "iPhone 15 Pro 256GB Titanio",
      brandSlug: "apple",
      categorySlug: "celulares",
      specifications: { storage: "256GB", color: "Titanio" },
    });

    const result = engine.evaluate(offer, [candidate]);

    expect(result.tier).not.toBe(ConfidenceTier.Auto);
    expect(result.suggestedDecision).not.toBe("auto-merge");
    expect(result.confidence).toBeLessThan(70);

    const specFactor = result.factors.find((f) => f.factor === "specifications");
    expect(specFactor?.matched).toBe(false);

    expect(result.mismatchedAttributes).toContain("specifications");
    const specPenalty = result.penalties.find((p) => p.attribute === "specifications");
    expect(specPenalty).toBeDefined();
    expect(specPenalty!.weightLost).toBeGreaterThan(0);
    expect(result.explainabilityReason).toContain("Mismatched attributes");
  });

  it("caps confidence when the brand does not match, regardless of name similarity", () => {
    const offer = makeOffer({ brandSlug: "samsung" });
    const candidate = makeCandidate({ brandSlug: "acer" });

    const result = engine.evaluate(offer, [candidate]);

    expect(result.confidence).toBeLessThanOrEqual(40);
    expect(result.tier).toBe(ConfidenceTier.NewProduct);
    expect(result.suggestedDecision).toBe("new-product");
    const brandFactor = result.factors.find((f) => f.factor === "brand");
    expect(brandFactor?.matched).toBe(false);

    const gatePenalty = result.penalties.find((p) => p.attribute === "brand-category-gate");
    expect(gatePenalty).toBeDefined();
    expect(result.explainabilityReason).toContain("capped at");
  });

  it("suggests a new product when there are no candidates at all", () => {
    const result = engine.evaluate(makeOffer(), []);

    expect(result.candidateProductId).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.tier).toBe(ConfidenceTier.NewProduct);
    expect(result.suggestedDecision).toBe("new-product");
    expect(result.algorithmVersion).toBe(PRODUCT_IDENTITY_ALGORITHM_VERSION);
    expect(result.matchedAttributes).toEqual([]);
    expect(result.mismatchedAttributes).toEqual(["candidates"]);
    expect(result.penalties).toEqual([]);
    expect(result.explainabilityReason).toContain("new product");
  });
});
