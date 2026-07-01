import { CsvFieldMapper } from "../mapping/CsvFieldMapper";

describe("CsvFieldMapper", () => {
  it("round-trips two rows including in_stock and price_brl parsing", () => {
    const csv = `name,brand,category,price_usd,price_brl,in_stock,store_slug
"MacBook Pro M3 14 polegadas",Apple,Notebooks,1299.99,7499.00,true,cellshop
"iPad Air M2 11 polegadas",Apple,Tablets,699.99,3999.00,false,cellshop`;

    const mapper = new CsvFieldMapper();
    const batch = mapper.parse(csv, "test-csv", "cellshop");

    expect(batch.items.length).toBe(2);
    expect(batch.items[0].product.name).toBe("MacBook Pro M3 14 polegadas");
    expect(batch.items[1].inStock).toBe(false);
    expect(batch.items[0].priceBRL).toBe(7499.0);
  });

  it("returns no items when the CSV has only a header row", () => {
    const mapper = new CsvFieldMapper();
    const batch = mapper.parse("name,price_usd", "test-csv", "cellshop");
    expect(batch.items.length).toBe(0);
  });
});
