import { MerchantFeedMatchPreview, type ExistingProductRef } from "../canonical/MerchantFeedMatchPreview";

const EXISTING: ExistingProductRef[] = [
  { id: "p-lg-lavadora", brand: "LG", name: "Lavarropas LG 11kg", slug: "lg-lavarropas-11kg" },
  { id: "p-sony-auricular", brand: "Sony", name: "Auriculares Sony inalámbricos", slug: "sony-auriculares" },
];

describe("MerchantFeedMatchPreview — casamento canônico (dry-run, sem escrita)", () => {
  it("classifica MATCHED para oferta de matriz + título igual", () => {
    const p = new MerchantFeedMatchPreview(EXISTING).preview([
      { product: { externalId: "123456", name: "Lavarropas LG 11kg", brand: "LG" } },
    ])[0];
    expect(p.status).toBe("MATCHED_EXISTING_PRODUCT");
    expect(p.matchedProductId).toBe("p-lg-lavadora");
  });

  it("classifica NEW_PRODUCT_CANDIDATE quando não existe equivalente", () => {
    const p = new MerchantFeedMatchPreview(EXISTING).preview([
      { product: { externalId: "9", name: "Refrigerador Samsung 400L", brand: "Samsung" } },
    ])[0];
    expect(p.status).toBe("NEW_PRODUCT_CANDIDATE");
  });

  it("classifica AMBIGUOUS quando há mais de um candidato (não false-merge)", () => {
    const existing = [
      { id: "a", brand: "X", name: "Celular Modelo 128" },
      { id: "b", brand: "X", name: "Celular Modelo 128" },
    ];
    const p = new MerchantFeedMatchPreview(existing).preview([
      { product: { externalId: "z", name: "Celular Modelo 128", brand: "X" } },
    ])[0];
    expect(p.status).toBe("AMBIGUOUS");
    expect(p.ambiguityCount).toBe(2);
  });

  it("classifica INVALID sem codigo e título", () => {
    const p = new MerchantFeedMatchPreview(EXISTING).preview([
      { product: { externalId: undefined, name: "" } },
    ])[0];
    expect(p.status).toBe("INVALID");
  });

  it("difereça de acento/colchetes não quebra o match (normaliza)", () => {
    const p = new MerchantFeedMatchPreview(EXISTING).preview([
      { product: { externalId: "x", name: "Auriculares Sony inalámbricos!", brand: "Sony" } },
    ])[0];
    expect(p.status).toBe("MATCHED_EXISTING_PRODUCT");
  });
});
