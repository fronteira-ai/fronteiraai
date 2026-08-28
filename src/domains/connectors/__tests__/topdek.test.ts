import { parseDetailPage } from "../crawler/topdek/detail-parser";
import { isProductUrl, parseProductUrl } from "../crawler/topdek/listing-parser";

// Fixtures inline (REUSE > live-website-only): representativo do JSON-LD
// Product real servido pelo Shopify da TopDek (verificado ao vivo).

function productHtml({ name, price, currency, availability, brand, extra = "" }: {
  name?: string; price?: string; currency?: string; availability?: string; brand?: string | null; extra?: string;
} = {}): string {
  const json: Record<string, unknown> = {
    "@context": "http://schema.org",
    "@type": "Product",
    name: name ?? "1/4in - Dual Layer [2 Color] | TopDek HDPE/EVA Foam Sheet",
    offers: {
      "@type": "Offer",
      price: price ?? "110.00",
      priceCurrency: currency ?? "USD",
      availability: availability ?? "http://schema.org/InStock",
    },
    image: "https://topdek.com/cdn/shop/files/Screenshot23.png?v=1&width=1920",
    url: "https://topdek.com/products/dual-color-marine-decking-full-sheet",
  };
  if (brand !== null && brand !== undefined) json.brand = { "@type": "Brand", name: brand };
  else if (brand === null) json.brand = null;
  if (extra) Object.assign(json, JSON.parse(extra));
  return `<html><head><script type="application/ld+json">${JSON.stringify(json)}</script></head></html>`;
}

describe("TopDek detail-parser", () => {
  it("parses produto normal (nome/brand/preço/USD/imagem/url)", () => {
    const { offer } = parseDetailPage("https://topdek.com/products/dual-color-marine-decking-full-sheet", "dual-color-marine-decking-full-sheet", productHtml({ brand: "topdekstore" }));
    expect(offer).not.toBeNull();
    expect(offer!.product.name).toContain("Dual Layer");
    expect(offer!.product.brand).toBe("topdekstore");
    expect(offer!.priceUSD).toBe(110);
    expect(offer!.currency).toBe("USD");
    expect(offer!.inStock).toBe(true);
    expect(offer!.product.imageUrl).toContain("Screenshot23.png");
    expect(offer!.productUrl).toContain("/products/dual-color");
  });

  it("trata promoção (preço menor) sem quebrar", () => {
    const { offer } = parseDetailPage("u", "x", productHtml({ price: "79.50", availability: "http://schema.org/InStock" }));
    expect(offer!.priceUSD).toBe(79.5);
  });

  it("out of stock → inStock false", () => {
    const { offer } = parseDetailPage("u", "x", productHtml({ availability: "http://schema.org/OutOfStock" }));
    expect(offer!.inStock).toBe(false);
  });

  it("campo brand ausente → undefined (sem quebrar)", () => {
    const { offer } = parseDetailPage("u", "x", productHtml({ brand: null }));
    expect(offer!.product.brand).toBeUndefined();
  });

  it("JSON-LD malformado → nulo (não lança)", () => {
    const broken = "<html><script type=\"application/ld+json\">{ not valid json </script></html>";
    const { offer, error } = parseDetailPage("u", "x", broken);
    expect(offer).toBeNull();
    expect(error).toBeTruthy();
  });

  it("sem preço válido → oferta rejeitada (não inventa)", () => {
    const { offer } = parseDetailPage("u", "x", productHtml({ price: "0" }));
    expect(offer).toBeNull();
  });
});

describe("TopDek listing-parser", () => {
  it("reconhece product URL do sitemap e extrai externalId", () => {
    expect(isProductUrl("https://topdek.com/products/dual-color-marine-decking-full-sheet")).toBe(true);
    const p = parseProductUrl("https://topdek.com/products/dual-color-marine-decking-full-sheet");
    expect(p?.externalId).toBe("dual-color-marine-decking-full-sheet");
  });

  it("rejeita raiz/não-produto", () => {
    expect(isProductUrl("https://topdek.com/")).toBe(false);
    expect(isProductUrl("https://topdek.com/pages/contact")).toBe(false);
  });
});
