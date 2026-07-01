import type { IFetchStrategy } from "../../crawler/fetch/IFetchStrategy";
import type { IDiscoverySource, DiscoveryResult } from "../types/discovery.types";
import { RobotsParser } from "../parsers/RobotsParser";
import { SitemapParser } from "../parsers/SitemapParser";

const SITEMAP_PATH = "/sitemap.xml";
const MAX_NESTED_SITEMAPS = 5;
const MAX_CANDIDATE_URLS = 20;

export class SitemapDiscoverySource implements IDiscoverySource {
  readonly key = "sitemap-discovery";

  private readonly robots = new RobotsParser();
  private readonly sitemap = new SitemapParser();

  constructor(private readonly fetcher: IFetchStrategy) {}

  async discover(domain: string): Promise<DiscoveryResult> {
    const normalizedDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const baseUrl = `https://${normalizedDomain}`;

    const robotsRes = await this.fetcher.fetch(`${baseUrl}/robots.txt`);
    const robotsTxt = robotsRes.ok ? robotsRes.html : "";
    const robotsAllowed = this.robots.isAllowed(robotsTxt, SITEMAP_PATH);

    if (!robotsAllowed) {
      return { domain: normalizedDomain, storeName: normalizedDomain, candidateProductUrls: [], robotsAllowed: false };
    }

    const sitemapRes = await this.fetcher.fetch(`${baseUrl}${SITEMAP_PATH}`);
    if (!sitemapRes.ok) {
      return { domain: normalizedDomain, storeName: normalizedDomain, candidateProductUrls: [], robotsAllowed: true };
    }

    let urls: string[];
    if (this.sitemap.isSitemapIndex(sitemapRes.html)) {
      // Cap recursion at one level of <sitemapindex> nesting — never crawl
      // beyond that (mission constraint: never aggressive scraping).
      const nestedSitemapUrls = this.sitemap.extractLocs(sitemapRes.html).slice(0, MAX_NESTED_SITEMAPS);
      const nested: string[] = [];
      for (const nestedUrl of nestedSitemapUrls) {
        const nestedRes = await this.fetcher.fetch(nestedUrl);
        if (nestedRes.ok) nested.push(...this.sitemap.extractLocs(nestedRes.html));
      }
      urls = nested;
    } else {
      urls = this.sitemap.extractLocs(sitemapRes.html);
    }

    return {
      domain: normalizedDomain,
      storeName: normalizedDomain,
      candidateProductUrls: urls.slice(0, MAX_CANDIDATE_URLS),
      robotsAllowed: true,
    };
  }
}
