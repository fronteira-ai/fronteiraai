import { isProductUrl, parseProductUrl } from "../crawler/megaeletronicos/listing-parser";

describe("megaeletronicos listing-parser", () => {
  it("recognizes a real product URL", () => {
    expect(isProductUrl("https://www.megaeletronicos.com/producto/1645255/celular-xiaomi")).toBe(true);
  });

  it("excludes category listing URLs", () => {
    expect(isProductUrl("https://www.megaeletronicos.com/producto/categoria/celular/110101")).toBe(false);
  });

  it("excludes brand listing URLs", () => {
    expect(isProductUrl("https://www.megaeletronicos.com/producto/marca/xiaomi-celulares/865")).toBe(false);
  });

  it("extracts the numeric external ID from a product URL", () => {
    expect(parseProductUrl("https://www.megaeletronicos.com/producto/1645255/celular-xiaomi")?.externalId).toBe("1645255");
  });
});

// detail-parser.ts (and every other sitemap-driven connector's detail
// parser) is intentionally NOT unit-tested under Jest here: the installed
// `entities` package (a transitive dependency of `node-html-parser`) ships
// as ESM-only with no CJS "require" export condition, which breaks under
// Jest's CJS module system ("Cannot use import statement outside a
// module") — a pre-existing gap discovered while writing this Wave's tests,
// not introduced by it (Shopping China's own detail-parser, in production
// since Release 1.7, has never had Jest coverage either, for the same
// reason). `tsx` (used by `scripts/sync-*.ts` and this Wave's live
// validation) resolves the same import correctly, so this is a Jest/module-
// resolution gap, not a real runtime bug — see `docs/engineering/TECH_DEBT.md`.
// This connector's detail-parser was instead validated against real,
// live-fetched HTML from megaeletronicos.com (see the Wave's final report).
