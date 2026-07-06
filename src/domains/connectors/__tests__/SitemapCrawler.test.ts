import { SitemapCrawler } from "../sdk/sitemap/SitemapCrawler";
import type { IFetchStrategy, FetchResult } from "../sdk/fetch/IFetchStrategy";

function makeFetcher(responses: Record<string, string>): IFetchStrategy {
  return {
    fetch: jest.fn(async (url: string): Promise<FetchResult> => {
      const html = responses[url];
      if (html === undefined) return { url, html: "", status: 404, ok: false, error: "not found" };
      return { url, html, status: 200, ok: true };
    }),
  };
}

describe("SitemapCrawler", () => {
  it("collects URLs from a flat sitemap, applying the filter", async () => {
    const xml = `<urlset>
      <url><loc>https://x.com/producto/a-1</loc></url>
      <url><loc>https://x.com/categoria/eletronicos</loc></url>
      <url><loc>https://x.com/producto/b-2</loc></url>
    </urlset>`;
    const fetcher = makeFetcher({ "https://x.com/sitemap.xml": xml });
    const crawler = new SitemapCrawler(fetcher);

    const urls = await crawler.collectUrls("https://x.com/sitemap.xml", { filter: (u) => u.includes("/producto/") });
    expect(urls.sort()).toEqual(["https://x.com/producto/a-1", "https://x.com/producto/b-2"]);
  });

  it("recurses into a sitemap index and merges results from sub-sitemaps", async () => {
    const index = `<sitemapindex>
      <sitemap><loc>https://x.com/sitemap-1.xml</loc></sitemap>
      <sitemap><loc>https://x.com/sitemap-2.xml</loc></sitemap>
    </sitemapindex>`;
    const sub1 = `<urlset><url><loc>https://x.com/producto/a-1</loc></url></urlset>`;
    const sub2 = `<urlset><url><loc>https://x.com/producto/b-2</loc></url></urlset>`;

    const fetcher = makeFetcher({
      "https://x.com/sitemap.xml": index,
      "https://x.com/sitemap-1.xml": sub1,
      "https://x.com/sitemap-2.xml": sub2,
    });
    const crawler = new SitemapCrawler(fetcher);

    const urls = await crawler.collectUrls("https://x.com/sitemap.xml");
    expect(urls.sort()).toEqual(["https://x.com/producto/a-1", "https://x.com/producto/b-2"]);
  });

  it("collectEntries surfaces lastmod per URL", async () => {
    const xml = `<urlset>
      <url><loc>https://x.com/producto/a-1</loc><lastmod>2026-07-01</lastmod></url>
      <url><loc>https://x.com/producto/b-2</loc></url>
    </urlset>`;
    const fetcher = makeFetcher({ "https://x.com/sitemap.xml": xml });
    const crawler = new SitemapCrawler(fetcher);

    const entries = await crawler.collectEntries("https://x.com/sitemap.xml");
    expect(entries.sort((a, b) => a.url.localeCompare(b.url))).toEqual([
      { url: "https://x.com/producto/a-1", lastmod: "2026-07-01" },
      { url: "https://x.com/producto/b-2", lastmod: null },
    ]);
  });

  it("stops recursing at maxDepth to avoid an unbounded walk on a malformed feed", async () => {
    // A sitemap index that points to itself — without a depth cap this would loop forever.
    const selfIndex = `<sitemapindex><sitemap><loc>https://x.com/sitemap.xml</loc></sitemap></sitemapindex>`;
    const fetcher = makeFetcher({ "https://x.com/sitemap.xml": selfIndex });
    const crawler = new SitemapCrawler(fetcher);

    const urls = await crawler.collectUrls("https://x.com/sitemap.xml", { maxDepth: 2 });
    expect(urls).toEqual([]);
  });

  it("skips a failed fetch without throwing", async () => {
    const fetcher = makeFetcher({});
    const crawler = new SitemapCrawler(fetcher);
    const urls = await crawler.collectUrls("https://x.com/missing.xml");
    expect(urls).toEqual([]);
  });
});
