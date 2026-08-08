import type { Product } from "@/types/product";

const mockFrom = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

// Imported after the mock so product.service.ts picks up the mocked client.
import { getRelatedProducts } from "../product.service";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-x",
    name: "Product X",
    slug: "product-x",
    description: "",
    brand_id: "brand-a",
    category_id: "category-1",
    image_url: null,
    specifications: null,
    created_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

function makeChain(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "neq", "limit", "in"];
  for (const method of methods) {
    chain[method] = jest.fn(() => chain);
  }
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

// Mission 03 (Decision Engine) — related products must never rank a
// same-category, wildly-different-price-tier product above a same-brand,
// same-tier one just because both happen to share a category.
describe("getRelatedProducts", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("returns [] when the reference product has no category", async () => {
    const result = await getRelatedProducts(makeProduct({ category_id: "" }));
    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("ranks same-brand, price-similar candidates above a same-category mismatched-tier candidate", async () => {
    const flagship = makeProduct({ id: "flagship", brand_id: "brand-a" });

    const sameBrandSimilarPrice = makeProduct({ id: "same-brand-similar", brand_id: "brand-a" });
    const otherBrandSimilarPrice = makeProduct({ id: "other-brand-similar", brand_id: "brand-b" });
    const sameBrandCheap = makeProduct({ id: "same-brand-cheap", brand_id: "brand-a" });

    mockFrom.mockImplementation((table: string) => {
      if (table === "products") {
        return makeChain({ data: [sameBrandSimilarPrice, otherBrandSimilarPrice, sameBrandCheap] });
      }
      if (table === "offers") {
        return makeChain({
          data: [
            { product_id: "flagship", price_usd: 1000 },
            { product_id: "same-brand-similar", price_usd: 980 },
            { product_id: "other-brand-similar", price_usd: 950 },
            { product_id: "same-brand-cheap", price_usd: 120 },
          ],
        });
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const result = await getRelatedProducts(flagship, 4);

    expect(result.map((p) => p.id)).toEqual(["same-brand-similar", "same-brand-cheap", "other-brand-similar"]);
  });

  it("never excludes a candidate purely for price distance — it only sorts it lower", async () => {
    const flagship = makeProduct({ id: "flagship", brand_id: "brand-a" });
    const entryLevel = makeProduct({ id: "entry-level", brand_id: "brand-a" });

    mockFrom.mockImplementation((table: string) => {
      if (table === "products") return makeChain({ data: [entryLevel] });
      if (table === "offers") {
        return makeChain({
          data: [
            { product_id: "flagship", price_usd: 1000 },
            { product_id: "entry-level", price_usd: 100 },
          ],
        });
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const result = await getRelatedProducts(flagship, 4);
    expect(result.map((p) => p.id)).toEqual(["entry-level"]);
  });

  it("logs and returns [] when the products query fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "products") return makeChain({ error: new Error("boom") });
      throw new Error(`unexpected table: ${table}`);
    });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await getRelatedProducts(makeProduct());

    expect(result).toEqual([]);
    consoleSpy.mockRestore();
  });
});
