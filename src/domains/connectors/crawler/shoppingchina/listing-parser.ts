// Wave 4 (Connector Tier 1 implementation) — product discovery moved from
// scraping category listing pages to the site's real sitemap.xml
// (confirmed live: https://www.shoppingchina.com.py/sitemap.xml, ~20,900
// URLs, declared in robots.txt). This file now only extracts the externalId
// out of a product URL already yielded by SitemapCrawler — it no longer
// fetches or parses a listing page.

export interface ListingProduct {
  url: string;
  slug: string;
  externalId: string;
}

const PRODUCT_URL_RE = /\/producto\/(.+)-(\d+)$/;

export function isProductUrl(url: string): boolean {
  return PRODUCT_URL_RE.test(url);
}

export function parseProductUrl(url: string): ListingProduct | null {
  const match = PRODUCT_URL_RE.exec(url);
  if (!match) return null;

  return { url, slug: match[1], externalId: match[2] };
}
