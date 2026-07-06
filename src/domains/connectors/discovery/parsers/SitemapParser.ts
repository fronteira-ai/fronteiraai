// Hand-rolled, regex-based — no new dependency (consistent with this codebase's
// existing preference for lightweight parsing over heavy deps, e.g.
// node-html-parser instead of cheerio/jsdom for the ShoppingChina crawler).
// Sitemap XML is a simple, well-defined, non-recursive-attribute format, so a
// full XML DOM parser isn't warranted.
const LOC_RE = /<loc>(.*?)<\/loc>/g;
const SITEMAP_INDEX_RE = /<sitemapindex[\s>]/i;
// One <url>...</url> (or <sitemap>...</sitemap>) block at a time, non-greedy,
// so a <lastmod> is paired with the <loc> in the same entry — matching them
// with two independent global regexes would misalign on any sitemap where
// some entries have a lastmod and others don't (common in practice).
const ENTRY_RE = /<(?:url|sitemap)>([\s\S]*?)<\/(?:url|sitemap)>/g;

export interface SitemapEntry {
  loc: string;
  lastmod: string | null;
}

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

  /** Same URLs as `extractLocs`, paired with `<lastmod>` when the sitemap
   * declares one per entry — used by the Delta Import Engine (Wave 5) to
   * skip refetching a page that hasn't changed since the last sync. */
  extractEntries(xml: string): SitemapEntry[] {
    const entries: SitemapEntry[] = [];
    let match: RegExpExecArray | null;
    ENTRY_RE.lastIndex = 0;
    while ((match = ENTRY_RE.exec(xml)) !== null) {
      const block = match[1];
      const locMatch = /<loc>(.*?)<\/loc>/.exec(block);
      const loc = locMatch?.[1]?.trim();
      if (!loc) continue;
      const lastmodMatch = /<lastmod>(.*?)<\/lastmod>/.exec(block);
      entries.push({ loc, lastmod: lastmodMatch?.[1]?.trim() || null });
    }
    return entries;
  }

  isSitemapIndex(xml: string): boolean {
    return SITEMAP_INDEX_RE.test(xml);
  }
}
