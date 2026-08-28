// TopDek (Shopify) — product URL extraction for SitemapCrawler.
// Roots are excluded; product URLs are `/products/<handle>`.

export interface ListingProduct {
  url: string;
  slug: string;
  externalId: string;
}

const PRODUCT_URL_RE = /^https?:\/\/topdek\.com\/products\/([a-z0-9-]+)(?:\?.*)?$/i;

export function isProductUrl(url: string): boolean {
  return PRODUCT_URL_RE.test(url);
}

export function parseProductUrl(url: string): ListingProduct | null {
  const match = PRODUCT_URL_RE.exec(url);
  if (!match) return null;
  return { url, slug: match[1].toLowerCase(), externalId: match[1].toLowerCase() };
}
