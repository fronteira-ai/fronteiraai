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

  describe("extractEntries", () => {
    it("pairs each loc with its own lastmod, not any other entry's", () => {
      const xml = `<urlset>
        <url><loc>https://example.com/a</loc><lastmod>2026-07-01</lastmod></url>
        <url><loc>https://example.com/b</loc></url>
        <url><loc>https://example.com/c</loc><lastmod>2026-07-03</lastmod></url>
      </urlset>`;
      expect(parser.extractEntries(xml)).toEqual([
        { loc: "https://example.com/a", lastmod: "2026-07-01" },
        { loc: "https://example.com/b", lastmod: null },
        { loc: "https://example.com/c", lastmod: "2026-07-03" },
      ]);
    });

    it("works for sitemap index entries (<sitemap> blocks) too", () => {
      const xml = `<sitemapindex>
        <sitemap><loc>https://example.com/sitemap-1.xml</loc><lastmod>2026-07-02</lastmod></sitemap>
      </sitemapindex>`;
      expect(parser.extractEntries(xml)).toEqual([{ loc: "https://example.com/sitemap-1.xml", lastmod: "2026-07-02" }]);
    });

    it("returns an empty array for malformed or empty XML", () => {
      expect(parser.extractEntries("")).toEqual([]);
    });
  });
});
