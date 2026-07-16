import { normalizeBrandName, KNOWN_BRAND_DUPLICATES } from "../data/brand-normalization";

describe("normalizeBrandName", () => {
  it("collapses case, corporate suffixes, and trademark symbols to the same identity", () => {
    expect(normalizeBrandName("Apple")).toBe(normalizeBrandName("APPLE"));
    expect(normalizeBrandName("Apple")).toBe(normalizeBrandName("apple"));
    expect(normalizeBrandName("Apple")).toBe(normalizeBrandName("Apple Inc"));
    expect(normalizeBrandName("Apple")).toBe(normalizeBrandName("Apple®"));
  });

  it("does not collapse genuinely different brands", () => {
    expect(normalizeBrandName("Apple")).not.toBe(normalizeBrandName("Samsung"));
  });

  it("collapses the 2 real duplicate groups measured against production", () => {
    for (const group of KNOWN_BRAND_DUPLICATES) {
      const normalized = group.variantNames.map(normalizeBrandName);
      expect(new Set(normalized).size).toBe(1);
    }
  });
});
