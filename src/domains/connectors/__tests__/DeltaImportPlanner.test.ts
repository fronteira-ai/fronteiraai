import { DeltaImportPlanner } from "../sdk/sitemap/DeltaImportPlanner";
import type { SitemapEntry } from "../sdk/sitemap/SitemapCrawler";

describe("DeltaImportPlanner", () => {
  const planner = new DeltaImportPlanner();

  it("fetches a URL with no previous snapshot", () => {
    const entries: SitemapEntry[] = [{ url: "https://x.com/a", lastmod: "2026-07-01" }];
    const { toFetch, skipped } = planner.plan(entries, new Map());
    expect(toFetch).toEqual(["https://x.com/a"]);
    expect(skipped).toEqual([]);
  });

  it("skips a URL whose lastmod is unchanged since the last snapshot", () => {
    const entries: SitemapEntry[] = [{ url: "https://x.com/a", lastmod: "2026-07-01" }];
    const previous = new Map([["https://x.com/a", "2026-07-01"]]);
    const { toFetch, skipped } = planner.plan(entries, previous);
    expect(toFetch).toEqual([]);
    expect(skipped).toEqual(["https://x.com/a"]);
  });

  it("fetches a URL whose lastmod moved forward", () => {
    const entries: SitemapEntry[] = [{ url: "https://x.com/a", lastmod: "2026-07-02" }];
    const previous = new Map([["https://x.com/a", "2026-07-01"]]);
    const { toFetch, skipped } = planner.plan(entries, previous);
    expect(toFetch).toEqual(["https://x.com/a"]);
    expect(skipped).toEqual([]);
  });

  it("always fetches a URL with no lastmod declared, even with a previous snapshot present for other URLs", () => {
    const entries: SitemapEntry[] = [{ url: "https://x.com/b", lastmod: null }];
    const previous = new Map([["https://x.com/a", "2026-07-01"]]);
    const { toFetch, skipped } = planner.plan(entries, previous);
    expect(toFetch).toEqual(["https://x.com/b"]);
    expect(skipped).toEqual([]);
  });

  it("handles a mixed batch correctly", () => {
    const entries: SitemapEntry[] = [
      { url: "https://x.com/unchanged", lastmod: "2026-07-01" },
      { url: "https://x.com/changed", lastmod: "2026-07-03" },
      { url: "https://x.com/new", lastmod: "2026-07-01" },
      { url: "https://x.com/no-lastmod", lastmod: null },
    ];
    const previous = new Map([
      ["https://x.com/unchanged", "2026-07-01"],
      ["https://x.com/changed", "2026-07-01"],
    ]);

    const { toFetch, skipped } = planner.plan(entries, previous);
    expect(skipped).toEqual(["https://x.com/unchanged"]);
    expect(toFetch.sort()).toEqual(["https://x.com/changed", "https://x.com/new", "https://x.com/no-lastmod"].sort());
  });
});
