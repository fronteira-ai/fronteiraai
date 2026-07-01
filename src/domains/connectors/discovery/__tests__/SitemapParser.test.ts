import { SitemapParser } from "../parsers/SitemapParser";

describe("SitemapParser", () => {
  const parser = new SitemapParser();

  it("extracts loc values from a flat urlset sitemap", () => {
    const xml = `<?xml version="1.0"?>
      <urlset><url><loc>https://example.com/a</loc></url><url><loc>https://example.com/b</loc></url></urlset>`;
    expect(parser.extractLocs(xml)).toEqual(["https://example.com/a", "https://example.com/b"]);
    expect(parser.isSitemapIndex(xml)).toBe(false);
  });

  it("detects a sitemap index and extracts nested sitemap URLs", () => {
    const xml = `<?xml version="1.0"?>
      <sitemapindex><sitemap><loc>https://example.com/sitemap-1.xml</loc></sitemap>
      <sitemap><loc>https://example.com/sitemap-2.xml</loc></sitemap></sitemapindex>`;
    expect(parser.isSitemapIndex(xml)).toBe(true);
    expect(parser.extractLocs(xml)).toEqual([
      "https://example.com/sitemap-1.xml",
      "https://example.com/sitemap-2.xml",
    ]);
  });

  it("returns an empty array for malformed or empty XML", () => {
    expect(parser.extractLocs("")).toEqual([]);
    expect(parser.extractLocs("<not-xml-at-all>")).toEqual([]);
  });
});
