import type { ConnectorCapabilities } from "../../types/capability.types";

// Declared honestly from live audit (Wave Ξ-1): the discovered products API
// returns numeric stock, structured category/brand arrays and image paths
// for every product — the cleanest data shape of all 5 connectors so far
// (a real JSON API, not HTML/JSON-LD scraping). Price currency has not been
// independently verified against a second source (no live page render
// available without a headless browser, out of scope) — treated as USD by
// convention with the other connectors, named as an assumption in
// product-mapper.ts, not hidden.
export const CAPABILITIES: ConnectorCapabilities = {
  supportsRealtime: true,
  supportsSearch: false,
  supportsPagination: true,
  supportsImages: true,
  supportsBrands: true,
  supportsCategories: true,
  supportsStock: true,
  supportsExchange: false,
  supportsStructuredData: true,
  supportsCanonicalMatching: true,
};
