export const ATACADO_CONNECT_CONFIG = {
  connectorId: "atacadoconnect",
  connectorVersion: "1.0.0",
  storeSlug: "atacado-connect",
  baseUrl: "https://atacadoconnect.com",
  sitemapUrl: "https://atacadoconnect.com/sitemap.xml",

  // Live audit (Program D — Wave 1) found sitemap.xml now contains ~18,000
  // real product URLs directly (`/produto/{category}/{slug}/{id}`) — the
  // prior audit's "sitemap incomplete, needs category-page pagination"
  // finding (Tier1_Merchants.md §5.9, from 2026-07-03) no longer holds
  // against today's live fetch. Sitemap-only discovery is sufficient.
  // Raised moderately (Program Ξ, Wave Ξ-5) — same reasoning as Roma
  // Shopping: measured 0% overlap with any other connected merchant
  // (MERCHANT_OVERLAP_MATRIX.md), grown for breadth, not prioritized for CPC.
  maxProducts: 600,

  requestDelayMs: 500,
  timeoutMs: 15_000,
} as const;
