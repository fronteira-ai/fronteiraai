export const TOPDEK_CONFIG = {
  connectorId: "topdek",
  connectorVersion: "1.0.0",
  storeSlug: "topdek",
  baseUrl: "https://topdek.com",
  // Sitemap INDEX (verified live) — the crawler recurses into the current
  // product shard (Shopify shard URLs carry volatile ?from/&to params, so we
  // must not hardcode a shard; the index resolves the live one).
  sitemapUrl: "https://topdek.com/sitemap.xml",

  // Real product sitemap yielded 254 locs at research time (fresh). Cap a bit
  // above with room to grow; Delta Import makes extra headroom safe (planned
  // runs skip unchanged). TopDek is a Shopify store — catalog is modest.
  maxProducts: 500,

  // Continuous Price Collection: sweep diário (cron 0 6 * * * existente).
  syncFrequencyHours: 24,

  // Politeness — Shopify is fine with a modest delay.
  requestDelayMs: 600,
  timeoutMs: 15_000,
} as const;
