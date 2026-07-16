import { normalizeBrandName } from "../data/brand-normalization";

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

  // Regression fixture for the 2 real duplicate groups measured against
  // production (scripts/kappa2-taxonomy-audit.ts, 2026-07-15) — inlined as
  // literal strings (not a shared `KNOWN_BRAND_DUPLICATES` constant,
  // removed by Program Κ Mission Κ-5: this same assertion is what proved
  // the constant redundant — the function alone already collapses both
  // groups without it).
  it("collapses the 2 real duplicate groups measured against production", () => {
    expect(normalizeBrandName("Meta Quest")).toBe(normalizeBrandName("Meta(quest)"));
    expect(normalizeBrandName("Rayban - Meta")).toBe(normalizeBrandName("Rayban(meta)"));
  });
});
