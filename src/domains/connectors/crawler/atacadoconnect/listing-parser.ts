// Live audit (Program D — Wave 1): atacadoconnect.com's sitemap mixes real
// product pages (`/produto/{category}/{slug}/{numericId}`) with static/
// utility pages (`/ofertas`, `/marcas`, `/como-chegar`, etc.) and brand
// listing pages (`/produto/marca/{slug}/{numericId}`, 4 segments). Only the
// 5-segment product path is a real product.

export interface ListingProduct {
  url: string;
  externalId: string;
}

const PRODUCT_URL_RE = /^https:\/\/atacadoconnect\.com\/produto\/[^/]+\/[^/]+\/(\d+)$/;

export function isProductUrl(url: string): boolean {
  return PRODUCT_URL_RE.test(url);
}

export function parseProductUrl(url: string): ListingProduct | null {
  const match = PRODUCT_URL_RE.exec(url);
  if (!match) return null;
  return { url, externalId: match[1] };
}
