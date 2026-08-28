import { familyToOffer } from "../crawler/newzone/family-mapper";

describe("NewZone familyToOffer — pública GraphQL → RawOffer honesto", () => {
  it("mapeia família real (nome/preço/imagem/externalId) com preço US$", () => {
    const offer = familyToOffer({ id_product_family: 49807, id_product: 49807, name: "APPLE CEL IPHONE 17 Pro Max 256GB", image_url: "https://x/img.jpg", min_price: 1100.5, max_price: 1100.5 });
    expect(offer.product.externalId).toBe("49807");
    expect(offer.product.name).toContain("IPHONE 17 Pro Max");
    expect(offer.product.imageUrl).toContain("img.jpg");
    expect(offer.priceUSD).toBe(1100.5);
    expect(offer.currency).toBe("USD");
    expect(offer.storeSlug).toBe("new-zone");
    expect(offer.productUrl).toContain("/producto/49807/");
  });

  it("preço 0/null → NÃO inventa (deixa 0; orquestrador rejeita inválido)", () => {
    const offer = familyToOffer({ id_product_family: 1, id_product: 1, name: "Sem preço", image_url: null, min_price: 0, max_price: null });
    expect(offer.priceUSD).toBe(0);
    expect(offer.product.imageUrl).toBeUndefined();
  });

  it("stock: NAO afirma disponibilidade a partir do listing (desconhecido ≠ disponível)", () => {
    const offer = familyToOffer({ id_product_family: 1, id_product: 1, name: "Item", image_url: null, min_price: 5, max_price: 5 });
    expect(offer.inStock).toBeUndefined();
  });

  it("normaliza espaços duplicados no nome", () => {
    const offer = familyToOffer({ id_product_family: 1, id_product: 1, name: "  SAMSUNG   CEL S26   5G  ", image_url: null, min_price: 900, max_price: 900 });
    expect(offer.product.name).toBe("SAMSUNG CEL S26 5G");
  });
});
