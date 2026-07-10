export const SHOPPING_CHINA_CONFIG = {
  connectorId: "shoppingchina",
  connectorVersion: "2.0.0",
  storeSlug: "shopping-china",
  baseUrl: "https://www.shoppingchina.com.py",
  sitemapUrl: "https://www.shoppingchina.com.py/sitemap.xml",

  // Maximum products per sync — the real sitemap has 20,000+ URLs (mixed
  // category + product); this caps how many /producto/ URLs are fetched in
  // one run. Raised (Program Ξ, Wave Ξ-5 — Competitive Marketplace
  // Expansion): Shopping China is part of the only merchant cluster with
  // measured real overlap (COMPETITIVE_DENSITY_MATRIX.md), so going deeper
  // into its catalog is the highest-evidence lever for Comparable Product
  // Coverage. Delta Import (Program Σ) makes this safe — repeated runs
  // advance progressively, never re-fetch what's unchanged.
  maxProducts: 1500,

  // Milliseconds to wait between HTTP requests (be respectful)
  requestDelayMs: 500,

  // Request timeout
  timeoutMs: 15_000,
} as const;
