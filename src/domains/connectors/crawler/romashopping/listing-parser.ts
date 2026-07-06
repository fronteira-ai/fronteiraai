// Live audit (Program D — Wave 1): romapy.com is WordPress + WooCommerce.
// Its sitemap index (`sitemap_index.xml`) points at ~130 sub-sitemaps —
// `post-sitemap.xml`/`page-sitemap.xml` (blog/static pages) plus
// `product-sitemap{1..N}.xml` (the actual catalog). `SitemapCrawler`
// already recurses into a sitemap index on its own (no code needed here for
// that) — this file only needs to recognize which *URLs* are real products
// once every sub-sitemap has been walked. Product URLs have no numeric ID
// (unlike Shopping China/Mega Eletrônicos) — the real external ID (SKU)
// lives on the product page itself, extracted in `detail-parser.ts`.

const PRODUCT_URL_RE = /^https:\/\/www\.romapy\.com\/shop\/[^/]+\/?$/;

export function isProductUrl(url: string): boolean {
  return PRODUCT_URL_RE.test(url);
}
