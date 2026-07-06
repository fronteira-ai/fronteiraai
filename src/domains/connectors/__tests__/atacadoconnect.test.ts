import { isProductUrl, parseProductUrl } from "../crawler/atacadoconnect/listing-parser";
import { parseDetailPage } from "../crawler/atacadoconnect/detail-parser";

describe("atacadoconnect listing-parser", () => {
  it("recognizes a real product URL", () => {
    expect(isProductUrl("https://atacadoconnect.com/produto/perfumes/perfume-x/1145687")).toBe(true);
  });

  it("excludes top-level brand listing URLs", () => {
    expect(isProductUrl("https://atacadoconnect.com/marca/apple")).toBe(false);
  });

  it("excludes top-level category listing URLs", () => {
    expect(isProductUrl("https://atacadoconnect.com/categoria/informatica/hardware/placas-mae")).toBe(false);
  });

  it("excludes static utility pages", () => {
    expect(isProductUrl("https://atacadoconnect.com/ofertas")).toBe(false);
  });

  it("extracts the numeric external ID", () => {
    expect(parseProductUrl("https://atacadoconnect.com/produto/perfumes/perfume-x/1145687")?.externalId).toBe("1145687");
  });
});

describe("atacadoconnect detail-parser", () => {
  function html(offers: Record<string, unknown> = {}) {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Perfume Maison Alhambra Perseus",
      description: "Uma fragrância sofisticada.",
      image: "https://cdn.atacadoconnect.com/produtos/1145687/img.webp",
      brand: { "@type": "Brand", name: "MAISON" },
      offers: { "@type": "Offer", priceCurrency: "USD", price: 12, availability: "https://schema.org/InStock", ...offers },
    };
    return `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
  }

  it("parses the schema.org Product JSON-LD block", () => {
    const { offer } = parseDetailPage(
      html(),
      "https://atacadoconnect.com/produto/perfumes/perfume-x/1145687",
      "atacado-connect",
      "1145687"
    );
    expect(offer?.priceUSD).toBe(12);
    expect(offer?.currency).toBe("USD");
    expect(offer?.inStock).toBe(true);
    expect(offer?.product.brand).toBe("MAISON");
    expect(offer?.product.category).toBe("perfumes");
  });

  it("marks out of stock when availability isn't InStock", () => {
    const { offer } = parseDetailPage(
      html({ availability: "https://schema.org/OutOfStock" }),
      "https://atacadoconnect.com/produto/perfumes/perfume-x/1145687",
      "atacado-connect",
      "1145687"
    );
    expect(offer?.inStock).toBe(false);
  });

  it("returns an error when no JSON-LD block exists", () => {
    const { offer, error } = parseDetailPage("<div>no json-ld</div>", "https://url", "atacado-connect", "1");
    expect(offer).toBeNull();
    expect(error).toContain("No JSON-LD");
  });

  it("returns an error when the price is zero or missing", () => {
    const { offer, error } = parseDetailPage(html({ price: 0 }), "https://url", "atacado-connect", "1");
    expect(offer).toBeNull();
    expect(error).toContain("No valid price");
  });
});
