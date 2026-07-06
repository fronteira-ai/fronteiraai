// Live audit (Program D — Wave 1): megaeletronicos.com's sitemap mixes 3 URL
// shapes — real products (`/producto/{numericId}/{slug}`), category listing
// pages (`/producto/categoria/{slug}/{numericId}`), and brand listing pages
// (`/producto/marca/{slug}/{numericId}`). Only the first is a real product.

export interface ListingProduct {
  url: string;
  externalId: string;
}

const PRODUCT_URL_RE = /\/producto\/(\d+)\/[^/]+$/;

export function isProductUrl(url: string): boolean {
  return PRODUCT_URL_RE.test(url);
}

export function parseProductUrl(url: string): ListingProduct | null {
  const match = PRODUCT_URL_RE.exec(url);
  if (!match) return null;
  return { url, externalId: match[1] };
}
