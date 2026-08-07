import { streamSitemapConnector } from "../streaming/SitemapConnectorStream";
import { DeltaEngine } from "../delta/DeltaEngine";
import type { IDeltaStateRepository, DeltaStateEntry } from "../repositories/IDeltaStateRepository";
import type { SitemapCrawler } from "../sdk/sitemap/SitemapCrawler";
import type { IFetchStrategy } from "../sdk/fetch/IFetchStrategy";
import { makeRawOffer } from "./helpers";

function makeDeltaStateRepo(previous: Map<string, string> = new Map()): IDeltaStateRepository & { saved: DeltaStateEntry[][] } {
  const saved: DeltaStateEntry[][] = [];
  return {
    saved,
    getCheckpoints: jest.fn().mockResolvedValue(previous),
    saveCheckpoints: jest.fn(async (_connectorId: string, entries: DeltaStateEntry[]) => {
      saved.push(entries);
    }),
  };
}

function makeSitemapCrawler(entries: { url: string; lastmod: string | null }[]): SitemapCrawler {
  return { collectEntries: jest.fn().mockResolvedValue(entries) } as unknown as SitemapCrawler;
}

async function drain<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of gen) items.push(item);
  return items;
}

describe("streamSitemapConnector", () => {
  const fetcher = {} as IFetchStrategy; // unused directly — fetchAndParse is a caller-provided closure

  it("yields one RawOffer per successfully parsed URL, in URL order", async () => {
    const entries = [
      { url: "https://x.com/a", lastmod: "2026-07-01" },
      { url: "https://x.com/b", lastmod: "2026-07-01" },
    ];
    const deltaStateRepo = makeDeltaStateRepo();

    const result = await drain(
      streamSitemapConnector({
        connectorId: "test",
        sitemapUrl: "https://x.com/sitemap.xml",
        timeoutMs: 1000,
        maxProducts: 100,
        dryRun: false,
        fetcher,
        sitemapCrawler: makeSitemapCrawler(entries),
        deltaEngine: new DeltaEngine(),
        deltaStateRepo,
        isProductUrl: () => true,
        logPrefix: "Test",
        fetchAndParse: async (url) => ({ offer: makeRawOffer({ productUrl: url }) }),
      })
    );

    expect(result.map((o) => o.productUrl)).toEqual(["https://x.com/a", "https://x.com/b"]);
  });

  it("never yields for a URL that fails to parse, but still advances", async () => {
    const entries = [
      { url: "https://x.com/a", lastmod: "2026-07-01" },
      { url: "https://x.com/b", lastmod: "2026-07-01" },
    ];
    const deltaStateRepo = makeDeltaStateRepo();

    const result = await drain(
      streamSitemapConnector({
        connectorId: "test",
        sitemapUrl: "https://x.com/sitemap.xml",
        timeoutMs: 1000,
        maxProducts: 100,
        dryRun: false,
        fetcher,
        sitemapCrawler: makeSitemapCrawler(entries),
        deltaEngine: new DeltaEngine(),
        deltaStateRepo,
        isProductUrl: () => true,
        logPrefix: "Test",
        fetchAndParse: async (url) => (url.endsWith("/a") ? { offer: null } : { offer: makeRawOffer({ productUrl: url }) }),
      })
    );

    expect(result.map((o) => o.productUrl)).toEqual(["https://x.com/b"]);
  });

  it("respects maxProducts — never fetches past the cap", async () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({ url: `https://x.com/${i}`, lastmod: "2026-07-01" }));
    const deltaStateRepo = makeDeltaStateRepo();
    const fetchAndParse = jest.fn(async (url: string) => ({ offer: makeRawOffer({ productUrl: url }) }));

    await drain(
      streamSitemapConnector({
        connectorId: "test",
        sitemapUrl: "https://x.com/sitemap.xml",
        timeoutMs: 1000,
        maxProducts: 3,
        dryRun: false,
        fetcher,
        sitemapCrawler: makeSitemapCrawler(entries),
        deltaEngine: new DeltaEngine(),
        deltaStateRepo,
        isProductUrl: () => true,
        logPrefix: "Test",
        fetchAndParse,
      })
    );

    expect(fetchAndParse).toHaveBeenCalledTimes(3);
  });

  it("skips a URL whose checkpoint is unchanged since the last run (Delta Import)", async () => {
    const entries = [
      { url: "https://x.com/a", lastmod: "2026-07-01" },
      { url: "https://x.com/b", lastmod: "2026-07-02" },
    ];
    const deltaStateRepo = makeDeltaStateRepo(new Map([["https://x.com/a", "2026-07-01"]]));
    const fetchAndParse = jest.fn(async (url: string) => ({ offer: makeRawOffer({ productUrl: url }) }));

    const result = await drain(
      streamSitemapConnector({
        connectorId: "test",
        sitemapUrl: "https://x.com/sitemap.xml",
        timeoutMs: 1000,
        maxProducts: 100,
        dryRun: false,
        fetcher,
        sitemapCrawler: makeSitemapCrawler(entries),
        deltaEngine: new DeltaEngine(),
        deltaStateRepo,
        isProductUrl: () => true,
        logPrefix: "Test",
        fetchAndParse,
      })
    );

    expect(fetchAndParse).toHaveBeenCalledTimes(1);
    expect(result.map((o) => o.productUrl)).toEqual(["https://x.com/b"]);
  });

  it("flushes checkpoints incrementally rather than once at the end — resilience to interruption", async () => {
    const entries = Array.from({ length: 5 }, (_, i) => ({ url: `https://x.com/${i}`, lastmod: "2026-07-01" }));
    const deltaStateRepo = makeDeltaStateRepo();

    await drain(
      streamSitemapConnector({
        connectorId: "test",
        sitemapUrl: "https://x.com/sitemap.xml",
        timeoutMs: 1000,
        maxProducts: 100,
        dryRun: false,
        fetcher,
        sitemapCrawler: makeSitemapCrawler(entries),
        deltaEngine: new DeltaEngine(),
        deltaStateRepo,
        isProductUrl: () => true,
        logPrefix: "Test",
        checkpointFlushEvery: 2,
        fetchAndParse: async (url) => ({ offer: makeRawOffer({ productUrl: url }) }),
      })
    );

    // 5 items, flush every 2 -> flushes at 2, 4, and a final flush of the
    // remaining 1 — more than one saveCheckpoints call proves checkpoints
    // are NOT all held back for a single call at the very end.
    expect(deltaStateRepo.saveCheckpoints).toHaveBeenCalledTimes(3);
    const allSavedKeys = deltaStateRepo.saved.flat().map((e) => e.key);
    expect(allSavedKeys.sort()).toEqual(entries.map((e) => e.url).sort());
  });

  it("never calls saveCheckpoints in dry-run mode, at any point", async () => {
    const entries = Array.from({ length: 5 }, (_, i) => ({ url: `https://x.com/${i}`, lastmod: "2026-07-01" }));
    const deltaStateRepo = makeDeltaStateRepo();

    await drain(
      streamSitemapConnector({
        connectorId: "test",
        sitemapUrl: "https://x.com/sitemap.xml",
        timeoutMs: 1000,
        maxProducts: 100,
        dryRun: true,
        fetcher,
        sitemapCrawler: makeSitemapCrawler(entries),
        deltaEngine: new DeltaEngine(),
        deltaStateRepo,
        isProductUrl: () => true,
        logPrefix: "Test",
        checkpointFlushEvery: 2,
        fetchAndParse: async (url) => ({ offer: makeRawOffer({ productUrl: url }) }),
      })
    );

    expect(deltaStateRepo.saveCheckpoints).not.toHaveBeenCalled();
  });
});
