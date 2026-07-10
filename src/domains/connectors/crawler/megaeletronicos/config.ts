export const MEGA_ELETRONICOS_CONFIG = {
  connectorId: "megaeletronicos",
  connectorVersion: "1.0.0",
  storeSlug: "mega-eletronicos",
  baseUrl: "https://www.megaeletronicos.com",
  sitemapUrl: "https://megaeletronicos.com/sitemap.xml",

  // Live audit (Program D — Wave 1): sitemap has ~8,200 real product URLs
  // mixed with ~296 category listing pages and ~2,900 brand listing pages
  // (all excluded by `isProductUrl`). Raised (Program Ξ, Wave Ξ-5) — Mega
  // Eletrônicos is the other half of the only measured real-overlap pair
  // (Shopping China × Mega Eletrônicos, MERCHANT_OVERLAP_MATRIX.md);
  // deepening this catalog is the highest-evidence lever for CPC.
  maxProducts: 1500,

  requestDelayMs: 500,
  timeoutMs: 15_000,
} as const;
