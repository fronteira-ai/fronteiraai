// Hand-rolled, regex-based — no new dependency (consistent with this codebase's
// existing preference for lightweight parsing over heavy deps, e.g.
// node-html-parser instead of cheerio/jsdom for the ShoppingChina crawler).
// Sitemap XML is a simple, well-defined, non-recursive-attribute format, so a
// full XML DOM parser isn't warranted.
const LOC_RE = /<loc>(.*?)<\/loc>/g;
const SITEMAP_INDEX_RE = /<sitemapindex[\s>]/i;

export class SitemapParser {
  extractLocs(xml: string): string[] {
    const locs: string[] = [];
    let match: RegExpExecArray | null;
    LOC_RE.lastIndex = 0;
    while ((match = LOC_RE.exec(xml)) !== null) {
      const url = match[1].trim();
      if (url) locs.push(url);
    }
    return locs;
  }

  isSitemapIndex(xml: string): boolean {
    return SITEMAP_INDEX_RE.test(xml);
  }
}
