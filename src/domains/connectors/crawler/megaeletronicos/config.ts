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
  //
  // Raised again (Fase 2, Sprint 2.6 — Attribute Backfill): Sprint 2.5's
  // live sync reported the sitemap yielding 5194 product URLs this run
  // (lower than the ~8,200 cited above — real catalog composition changes
  // over time, not treated as a contradiction to resolve). At
  // maxProducts=1500, only ~29% of that was reprocessed, so Sprint 2.5's
  // feature_product specifications extraction never reached most of the
  // existing catalog. Raised to cover the full sitemap in one pass; a
  // one-time coverage catch-up, not a standing operational cadence change.
  maxProducts: 6000,

  requestDelayMs: 500,
  timeoutMs: 15_000,
} as const;
