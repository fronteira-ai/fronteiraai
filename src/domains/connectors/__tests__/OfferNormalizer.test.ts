import { normalizeOffer } from "../normalization/OfferNormalizer";
import { makeRawOffer } from "./helpers";

describe("normalizeOffer", () => {
  it("slugifies the product/brand/category names", () => {
    const normalized = normalizeOffer(
      makeRawOffer({ product: { name: "Apple iPhone 16 Pro 256GB", brand: "Apple", category: "Fones de Ouvido" } })
    );
    expect(normalized.product.slug).toBe("apple-iphone-16-pro-256gb");
    expect(normalized.product.brandSlug).toBe("apple");
    expect(normalized.product.categorySlug).toBe("fones-de-ouvido");
    expect(normalized.offer.priceUSD).toBe(99.99);
    expect(normalized.offer.inStock).toBe(true);
  });

  it("normalizes known category synonyms to a shared canonical category (Sprint 2.5)", () => {
    const normalized = normalizeOffer(makeRawOffer({ product: { name: "Test", category: "Smartphones" } }));
    expect(normalized.product.categoryName).toBe("Celulares e Smartphones");
    expect(normalized.product.categorySlug).toBe("celulares-e-smartphones");
  });

  it("defaults brand/category to 'Outros' when missing", () => {
    const normalized = normalizeOffer(makeRawOffer({ product: { name: "Generic Product" } }));
    expect(normalized.product.brandName).toBe("Outros");
    expect(normalized.product.categoryName).toBe("Outros");
  });

  it("nulls out a malformed image URL instead of throwing", () => {
    const normalized = normalizeOffer(makeRawOffer({ product: { name: "Test Product", imageUrl: "not-a-url" } }));
    expect(normalized.product.imageUrl).toBeNull();
  });

  it("produces an ASCII-only slug from an accented name", () => {
    const normalized = normalizeOffer(makeRawOffer({ product: { name: "Perfume Árabe Açaí & Bêbê" } }));
    expect(/^[a-z0-9-]+$/.test(normalized.product.slug)).toBe(true);
    expect(normalized.product.slug).not.toContain("á");
    expect(normalized.product.slug).not.toContain("ê");
  });

  it("throws when the product name cannot be slugified at all", () => {
    expect(() => normalizeOffer(makeRawOffer({ product: { name: "!!!" } }))).toThrow();
  });
});
