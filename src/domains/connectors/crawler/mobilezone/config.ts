// Wave Ξ-1 (PROGRAM Ξ, Marketplace Domination Strategy). Discovered via
// legitimate means only (public robots.txt confirmed permissive, no
// ClaudeBot/AI-crawler disallow; the site's own publicly-served JS bundle
// — a normal static asset fetch, no execution — reveals a fully public,
// unauthenticated, CORS-open ("Access-Control-Allow-Origin: *") REST API
// with a /health endpoint. This is the exact API the site's own React
// frontend calls; reading it does not bypass any protection.
export const MOBILE_ZONE_CONFIG = {
  connectorId: "mobilezone",
  connectorVersion: "1.0.0",
  storeSlug: "mobile-zone",
  baseUrl: "https://www.mobilezone.com.py",
  apiBaseUrl: "https://products-api-dns.mobilezone.com.py/api",

  // Confirmed live: base image path returned by the API (`url_image`) is
  // relative — this prefix, found in the same JS bundle, makes it absolute.
  imageBaseUrl: "https://images.mobilezone.com.br/s3-images/image/",

  // Same convention as the other 4 connectors — real catalog is larger
  // (API reports count: 6956). Raised (Program Ξ, Wave Ξ-5) — Mobile Zone
  // is in the same "Celulares/Eletrônicos gerais" cluster the only measured
  // real overlap belongs to (COMPETITIVE_DENSITY_MATRIX.md); certified and
  // on a real schedule since Wave Xi-1.
  //
  // Raised again (Fase 2, Sprint 2.6 — Attribute Backfill): live API call
  // during Sprint 2.4/2.5 reported `count: 7212` (up from the 6956 cited
  // above — real catalog grows over time, not a discrepancy to chase).
  // Sprint 2.5's parser fix (productHasDetails/productHasColors →
  // specifications) only reaches items an --execute sync actually
  // re-fetches; at maxProducts=1500 per run, ~90% of the catalog — including
  // the exact cross-merchant strategic-product pairs Sprint 2.3 identified —
  // was never touched. Raised to cover the full known catalog in one pass;
  // a one-time coverage catch-up, not a standing operational cadence change.
  maxProducts: 8000,

  // Page size for the /products?offset=&limit= endpoint.
  pageSize: 100,

  requestDelayMs: 500,
  timeoutMs: 15_000,
} as const;
