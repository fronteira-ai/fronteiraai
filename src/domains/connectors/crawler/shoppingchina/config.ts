export const SHOPPING_CHINA_CONFIG = {
  connectorId: "shoppingchina",
  connectorVersion: "2.0.0",
  storeSlug: "shopping-china",
  baseUrl: "https://www.shoppingchina.com.py",
  sitemapUrl: "https://www.shoppingchina.com.py/sitemap.xml",

  // Maximum products per sync — the real sitemap has 20,000+ URLs (mixed
  // category + product); this caps how many /producto/ URLs are fetched in
  // one run. Raise for a full crawl once the connector is certified and
  // running on a real schedule.
  maxProducts: 200,

  // Milliseconds to wait between HTTP requests (be respectful)
  requestDelayMs: 500,

  // Request timeout
  timeoutMs: 15_000,
} as const;
