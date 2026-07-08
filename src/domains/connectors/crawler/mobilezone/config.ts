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
  // (API reports count: 6956); raise once certified and on a real schedule.
  maxProducts: 200,

  // Page size for the /products?offset=&limit= endpoint.
  pageSize: 100,

  requestDelayMs: 500,
  timeoutMs: 15_000,
} as const;
