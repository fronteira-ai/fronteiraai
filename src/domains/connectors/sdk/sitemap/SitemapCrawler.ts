import type { IFetchStrategy } from "../fetch/IFetchStrategy";
import { SitemapParser } from "../../discovery/parsers/SitemapParser";

export interface SitemapCrawlOptions {
  timeoutMs?: number;
  /** Only URLs matching this predicate are kept — lets a connector pull just
   * `/producto/*` out of a sitemap that also lists category/static pages. */
  filter?: (url: string) => boolean;
  /** Sitemap indexes point at sub-sitemaps, which could themselves be
   * indexes — capped to avoid an unbounded/circular walk on a malformed feed. */
  maxDepth?: number;
}

export interface SitemapEntry {
  url: string;
  /** `<lastmod>` alongside this `<loc>`, when the sitemap declares one —
   * null otherwise. Populated only for entries in the deepest (non-index)
   * sitemap files, same place `<lastmod>` actually appears in practice. */
  lastmod: string | null;
}

const DEFAULT_MAX_DEPTH = 3;

/**
 * Connector SDK — shared by every sitemap-driven connector (Shopping China
 * today; Mega Eletrônicos/Roma Shopping/Atacado Connect once resumed) — one
 * implementation of "walk a sitemap, recurse into sub-sitemaps, collect
 * matching URLs" instead of one per connector. Reuses `SitemapParser`
 * (originally built for Discovery, Release 1.7 — Wave 2) rather than a
 * second XML parser — Discovery and connector fetch both depend on the SDK,
 * never on each other.
 */
export class SitemapCrawler {
  private readonly parser = new SitemapParser();

  constructor(private readonly fetcher: IFetchStrategy) {}

  async collectUrls(sitemapUrl: string, options: SitemapCrawlOptions = {}): Promise<string[]> {
    return (await this.collectEntries(sitemapUrl, options)).map((e) => e.url);
  }

  /** Same walk as `collectUrls`, but also surfaces `<lastmod>` per URL when
   * the sitemap declares it — the input the Delta Import Engine (Wave 5)
   * uses to skip refetching a product page that hasn't changed since the
   * last successful sync. */
  async collectEntries(sitemapUrl: string, options: SitemapCrawlOptions = {}): Promise<SitemapEntry[]> {
    const { timeoutMs = 15_000, filter, maxDepth = DEFAULT_MAX_DEPTH } = options;
    const collected = new Map<string, SitemapEntry>();
    await this.walk(sitemapUrl, timeoutMs, filter, maxDepth, collected, new Set());
    return [...collected.values()];
  }

  private async walk(
    url: string,
    timeoutMs: number,
    filter: ((url: string) => boolean) | undefined,
    depthRemaining: number,
    collected: Map<string, SitemapEntry>,
    visited: Set<string>
  ): Promise<void> {
    if (depthRemaining <= 0 || visited.has(url)) return;
    visited.add(url);

    const result = await this.fetcher.fetch(url, { timeoutMs });
    if (!result.ok) {
      console.warn(`[SitemapCrawler] Failed to fetch ${url}: ${result.error}`);
      return;
    }

    if (this.parser.isSitemapIndex(result.html)) {
      for (const subSitemapUrl of this.parser.extractLocs(result.html)) {
        await this.walk(subSitemapUrl, timeoutMs, filter, depthRemaining - 1, collected, visited);
      }
      return;
    }

    for (const entry of this.parser.extractEntries(result.html)) {
      if (!filter || filter(entry.loc)) collected.set(entry.loc, { url: entry.loc, lastmod: entry.lastmod });
    }
  }
}
