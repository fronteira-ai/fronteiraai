import {
  candidateImageUrl,
  candidatePriceUSD,
  hasAvailableOffer,
  hasUsableImage,
  hasValidPrice,
  hasValidSlug,
  isCatalogItemHomeReady,
  isHighlightHomeReady,
  isHomeReadyProduct,
} from "@/utils/homeDataQuality";

describe("candidateImageUrl", () => {
  it("prefere image_url (catálogo) sobre imageUrl (highlight)", () => {
    expect(candidateImageUrl({ image_url: "https://a.com/x.webp", imageUrl: "https://b.com/y.webp" })).toBe("https://a.com/x.webp");
    expect(candidateImageUrl({ imageUrl: "https://b.com/y.webp" })).toBe("https://b.com/y.webp");
    expect(candidateImageUrl({})).toBeNull();
  });
});

describe("hasValidSlug", () => {
  it("aceita slug não vazio", () => {
    expect(hasValidSlug("iphone-17-pro")).toBe(true);
    expect(hasValidSlug("  com-espacos  ")).toBe(true);
  });

  it("rejeita slug ausente ou vazio", () => {
    expect(hasValidSlug(null)).toBe(false);
    expect(hasValidSlug(undefined)).toBe(false);
    expect(hasValidSlug("")).toBe(false);
    expect(hasValidSlug("   ")).toBe(false);
  });
});

describe("hasUsableImage", () => {
  it("aceita URL real", () => {
    expect(hasUsableImage({ image_url: "https://cdn.example.com/foto.webp" })).toBe(true);
  });

  it("rejeita placeholder de seed (placehold.co) como imagem inexistente", () => {
    expect(hasUsableImage({ image_url: "https://placehold.co/600x400" })).toBe(false);
  });

  it("rejeita imagem ausente e considera imageUrl (highlight) também", () => {
    expect(hasUsableImage({ image_url: null })).toBe(false);
    expect(hasUsableImage({ imageUrl: "https://cdn.example.com/foto.webp" })).toBe(true);
  });
});

describe("hasValidPrice / candidatePriceUSD", () => {
  it("aceita preço finito > 0 em lowestPriceUSD ou priceUSD", () => {
    expect(hasValidPrice({ lowestPriceUSD: 123.45 })).toBe(true);
    expect(hasValidPrice({ priceUSD: 1 })).toBe(true);
    // lowestPriceUSD presente e válido tem precedência sobre priceUSD
    expect(candidatePriceUSD({ lowestPriceUSD: 42, priceUSD: 7 })).toBe(42);
    // lowestPriceUSD ausente → cai para priceUSD
    expect(candidatePriceUSD({ lowestPriceUSD: null, priceUSD: 42 })).toBe(42);
  });

  it("rejeita null, 0 e negativos", () => {
    expect(hasValidPrice({ lowestPriceUSD: null })).toBe(false);
    expect(hasValidPrice({ priceUSD: 0 })).toBe(false);
    expect(hasValidPrice({ priceUSD: -5 })).toBe(false);
    // 0 presente no campo de maior precedência não cai para priceUSD
    expect(candidatePriceUSD({ lowestPriceUSD: 0, priceUSD: 42 })).toBeNull();
    expect(candidatePriceUSD({})).toBeNull();
  });

  it("rejeita não-número e infinito", () => {
    expect(candidatePriceUSD({ priceUSD: NaN })).toBeNull();
    expect(candidatePriceUSD({ priceUSD: Infinity })).toBeNull();
  });
});

describe("hasAvailableOffer", () => {
  it("usa offers[] com available=true quando presentes", () => {
    expect(hasAvailableOffer({ offers: [{ available: true }] })).toBe(true);
    expect(hasAvailableOffer({ offers: [{ available: false }, { available: false }] })).toBe(false);
  });

  it("cai no sinal agregado inStock quando offers[] não foi carregado", () => {
    expect(hasAvailableOffer({ inStock: true })).toBe(true);
    expect(hasAvailableOffer({ inStock: false })).toBe(false);
    expect(hasAvailableOffer({})).toBe(false);
  });
});

describe("isHomeReadyProduct", () => {
  const ready = {
    slug: "iphone-17-pro",
    image_url: "https://cdn.example.com/foto.webp",
    lowestPriceUSD: 999,
    inStock: true,
  };

  it("aceita produto completo elegível", () => {
    expect(isHomeReadyProduct(ready)).toBe(true);
  });

  it("rejeita se qualquer requisito falhar", () => {
    expect(isHomeReadyProduct({ ...ready, slug: "" })).toBe(false);
    expect(isHomeReadyProduct({ ...ready, image_url: "https://placehold.co/600x400" })).toBe(false);
    expect(isHomeReadyProduct({ ...ready, lowestPriceUSD: 0 })).toBe(false);
    expect(isHomeReadyProduct({ ...ready, inStock: false })).toBe(false);
  });
});

describe("adapters para tipos reais", () => {
  it("isCatalogItemHomeReady mapeia ProductCatalogItem", () => {
    expect(
      isCatalogItemHomeReady({
        id: "p1",
        name: "Produto",
        slug: "produto",
        description: "",
        brand_id: "b1",
        category_id: "c1",
        image_url: "https://cdn.example.com/x.webp",
        specifications: null,
        created_at: "",
        brand: null,
        category: null,
        lowestPriceUSD: 10,
        inStock: true,
      })
    ).toBe(true);
  });

  it("isHighlightHomeReady mapeia ProductHighlight", () => {
    expect(isHighlightHomeReady({ id: "p1", slug: "produto", name: "P", imageUrl: "https://cdn.example.com/x.webp", priceUSD: 10, inStock: true })).toBe(true);
    expect(isHighlightHomeReady({ id: "p1", slug: "produto", name: "P", imageUrl: null, inStock: true })).toBe(false);
  });
});
