import { isProductUrl } from "../crawler/romashopping/listing-parser";

describe("romashopping listing-parser", () => {
  it("recognizes a real product URL", () => {
    expect(isProductUrl("https://www.romapy.com/shop/soundbar-jbl-cinema-sb510-3-1-bluetooth/")).toBe(true);
  });

  it("excludes non-shop URLs (blog posts, static pages)", () => {
    expect(isProductUrl("https://www.romapy.com/sobre-nos/")).toBe(false);
  });
});

// detail-parser.ts is intentionally NOT unit-tested under Jest — same
// pre-existing `node-html-parser`/`entities` ESM/CJS gap documented in
// megaeletronicos.test.ts. Validated instead against real, live-fetched
// HTML from romapy.com (see the Wave's final report).
