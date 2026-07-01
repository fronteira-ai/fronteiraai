import { JsonFieldMapper } from "../mapping/JsonFieldMapper";

describe("JsonFieldMapper", () => {
  it("round-trips a single-item array", () => {
    const json = JSON.stringify([
      {
        product: { name: "Parsed Product", brand: "Sony", category: "Audio" },
        storeSlug: "mega-eletronicos",
        priceUSD: 199.99,
        inStock: true,
      },
    ]);

    const mapper = new JsonFieldMapper();
    const batch = mapper.parse(json, "test-connector", "mega-eletronicos");

    expect(batch.items.length).toBe(1);
    expect(batch.items[0].product.name).toBe("Parsed Product");
    expect(batch.items[0].priceUSD).toBe(199.99);
  });

  it("accepts snake_case keys as a fallback", () => {
    const json = JSON.stringify([{ name: "Snake Product", price_usd: 49.5, in_stock: false }]);
    const mapper = new JsonFieldMapper();
    const batch = mapper.parse(json, "test-connector", "default-store");

    expect(batch.items[0].product.name).toBe("Snake Product");
    expect(batch.items[0].priceUSD).toBe(49.5);
    expect(batch.items[0].inStock).toBe(false);
    expect(batch.items[0].storeSlug).toBe("default-store");
  });
});
