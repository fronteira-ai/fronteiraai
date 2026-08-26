export const ROMA_SHOPPING_CONFIG = {
  connectorId: "romashopping",
  connectorVersion: "1.0.0",
  storeSlug: "roma-shopping",
  baseUrl: "https://www.romapy.com",
  sitemapUrl: "https://www.romapy.com/sitemap_index.xml",

  // Live audit (Program D — Wave 1): the largest catalog of the 3 new
  // connectors (~50,000 URLs across ~130 sub-sitemaps, per Tier1_Merchants.md
  // §5.6). Raised moderately, not aggressively (Program Ξ, Wave Ξ-5) — real
  // measurement (MERCHANT_OVERLAP_MATRIX.md) shows 0% overlap with any
  // other connected merchant; still worth growing for catalog breadth, but
  // evidence doesn't support prioritizing it for Comparable Product Coverage.
  //
  // Raised again (Mission 04 — Offer Density): only ~1,564 products (~3% of
  // the ~50,000-URL real catalog) had ever been captured — the 600/run cap
  // was throttling Delta Import's progress far below the real backlog size,
  // the same under-capture pattern already fixed once for Mega Eletrônicos/
  // Mobile Zone (Sprint 2.6). Set above the last known real sitemap size,
  // same precedent — a one-time coverage catch-up, not a standing cadence
  // change; Delta Import means a run that doesn't reach the full backlog in
  // one pass loses nothing, the next run resumes where this one stopped.
  maxProducts: 55_000,

  // No declared Crawl-delay in robots.txt — self-imposed courtesy delay,
  // same reasoning as Shopping China/Mega Eletrônicos.
  requestDelayMs: 500,
  timeoutMs: 15_000,
} as const;
