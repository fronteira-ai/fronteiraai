import { factsFromProductSignature, factCategoryFromTaxonomy, factBrandFromNormalization } from "../factories/LearnedFactFactory";
import { FactType, MARKETPLACE_MEMORY_ALGORITHM_VERSION } from "../types/enums";
import type { ProductSignature } from "@/src/domains/product-intelligence";

function emptyAttr<T>() {
  return { value: null as T | null, source: null, confidence: null, extractedFrom: null };
}

function makeSignature(overrides: Partial<ProductSignature> = {}): ProductSignature {
  return {
    canonicalProductId: "product-1",
    brand: emptyAttr<string>(),
    model: emptyAttr<string>(),
    color: emptyAttr<string>(),
    capacityGb: emptyAttr<number>(),
    ramGb: emptyAttr<number>(),
    screenSizeIn: emptyAttr<number>(),
    processor: emptyAttr<string>(),
    gpu: emptyAttr<string>(),
    voltage: emptyAttr<string>(),
    powerW: emptyAttr<number>(),
    ean: emptyAttr<string>(),
    manufacturerCode: emptyAttr<string>(),
    bundleIncludes: emptyAttr<string[]>(),
    ...overrides,
  };
}

describe("factsFromProductSignature", () => {
  it("emits nothing for a signature with every field null", () => {
    const facts = factsFromProductSignature("product-1", makeSignature(), null);
    expect(facts).toEqual([]);
  });

  it("emits a fact only for fields with a real value, source, and confidence", () => {
    const signature = makeSignature({
      manufacturerCode: { value: "A3257", source: "name", confidence: "medium", extractedFrom: "candidates: [A3257]" },
      color: { value: "Preto", source: "specifications", confidence: "high", extractedFrom: 'COR="Preto"' },
    });

    const facts = factsFromProductSignature("product-1", signature, "store-1");

    expect(facts).toHaveLength(2);
    const manufacturerCodeFact = facts.find((f) => f.factType === FactType.ManufacturerCode);
    expect(manufacturerCodeFact).toMatchObject({
      canonicalProductId: "product-1",
      factValue: "A3257",
      confidence: "medium",
      source: "name",
      merchantId: "store-1",
      origin: "backfill",
      algorithmVersion: MARKETPLACE_MEMORY_ALGORITHM_VERSION,
    });
    const colorFact = facts.find((f) => f.factType === FactType.Color);
    expect(colorFact).toMatchObject({ factValue: "Preto", confidence: "high", source: "specifications" });
  });

  it("joins array values (bundleIncludes) into a comma-separated string", () => {
    const signature = makeSignature({
      bundleIncludes: { value: ["Cabo USB-C", "Manual"], source: "specifications", confidence: "high", extractedFrom: "INCLUI" },
    });
    const facts = factsFromProductSignature("product-1", signature, null);
    expect(facts[0].factValue).toBe("Cabo USB-C, Manual");
  });

  it("never persists brand, family, line, or tokens — no code path emits them", () => {
    // brand is intentionally excluded even when present, per the factory's
    // own documented decision (brand_id is already structured).
    const signature = makeSignature({
      brand: { value: "Apple", source: "brand_id", confidence: "high", extractedFrom: "brands.name" },
    });
    const facts = factsFromProductSignature("product-1", signature, null);
    expect(facts.find((f) => f.factType === FactType.Brand)).toBeUndefined();
    expect(facts.find((f) => f.factType === FactType.Family)).toBeUndefined();
    expect(facts.find((f) => f.factType === FactType.Line)).toBeUndefined();
    expect(facts.find((f) => f.factType === FactType.Tokens)).toBeUndefined();
  });
});

describe("factCategoryFromTaxonomy", () => {
  it("builds a high-confidence, taxonomy-sourced fact", () => {
    const fact = factCategoryFromTaxonomy("product-1", "smartphones", "store-1");
    expect(fact).toMatchObject({
      canonicalProductId: "product-1",
      factType: FactType.Category,
      factValue: "smartphones",
      confidence: "high",
      source: "taxonomy",
      merchantId: "store-1",
    });
  });
});

describe("factBrandFromNormalization", () => {
  it("builds a high-confidence, brand_id-sourced fact", () => {
    const fact = factBrandFromNormalization("product-1", "apple", null);
    expect(fact).toMatchObject({
      canonicalProductId: "product-1",
      factType: FactType.Brand,
      factValue: "apple",
      confidence: "high",
      source: "brand_id",
      merchantId: null,
    });
  });
});
