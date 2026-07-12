import { mapApiProduct } from "../crawler/mobilezone/product-mapper";

function baseProduct(overrides: Record<string, unknown> = {}) {
  return {
    id_product: 1,
    stock: 5,
    price: "100.00",
    name_py: "Test Product",
    productHasCategories: [{ id_category: 1, name_py: "Celulares" }],
    productHasImages: [{ url_image: "path/to/image.jpg" }],
    productHasBrands: [{ id_brand: 1, name_py: "Apple" }],
    ...overrides,
  };
}

describe("mapApiProduct", () => {
  it("maps productHasDetails labeled entries into specifications", () => {
    const result = mapApiProduct(
      baseProduct({
        productHasDetails: [
          { name_py: "iPhone 11 Pro Max A2218", detail: { name_py: "Modelo" } },
          { name_py: "Total de 512GB", detail: { name_py: "Capacidad de almacenamiento" } },
        ],
      })
    );

    expect(result.offer?.product.specifications).toEqual({
      Modelo: "iPhone 11 Pro Max A2218",
      "Capacidad de almacenamiento": "Total de 512GB",
    });
  });

  it("maps productHasColors into a Color specification key", () => {
    const result = mapApiProduct(baseProduct({ productHasColors: [{ name_py: "Gold" }] }));
    expect(result.offer?.product.specifications).toEqual({ Color: "Gold" });
  });

  it("skips detail entries missing a label or a value", () => {
    const result = mapApiProduct(
      baseProduct({
        productHasDetails: [
          { name_py: "orphan value", detail: undefined },
          { name_py: "", detail: { name_py: "Empty Value" } },
        ],
      })
    );
    expect(result.offer?.product.specifications).toBeUndefined();
  });

  it("leaves specifications undefined when neither field is present", () => {
    const result = mapApiProduct(baseProduct());
    expect(result.offer?.product.specifications).toBeUndefined();
  });

  it("still returns an error for a product with no name (unaffected by this change)", () => {
    const result = mapApiProduct(baseProduct({ name_py: "" }));
    expect(result.offer).toBeNull();
    expect(result.error).toContain("has no name");
  });
});
