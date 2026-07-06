export const ROMA_SHOPPING_CONFIG = {
  connectorId: "romashopping",
  connectorVersion: "1.0.0",
  storeSlug: "roma-shopping",
  baseUrl: "https://www.romapy.com",
  sitemapUrl: "https://www.romapy.com/sitemap_index.xml",

  // Live audit (Program D — Wave 1): the largest catalog of the 3 new
  // connectors (~50,000 URLs across ~130 sub-sitemaps, per Tier1_Merchants.md
  // §5.6) — capped low for first certification, same "prove correctness on
  // a small slice, raise later" approach as every other connector.
  maxProducts: 200,

  // No declared Crawl-delay in robots.txt — self-imposed courtesy delay,
  // same reasoning as Shopping China/Mega Eletrônicos.
  requestDelayMs: 500,
  timeoutMs: 15_000,
} as const;
