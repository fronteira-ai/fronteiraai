import type { ConnectorCapabilities } from "../../types/capability.types";

// Declared honestly after the Wave 4 recertification + Wave 5 review —
// supportsStock is false on purpose: detail-parser.ts hardcodes
// `inStock: true` (no explicit stock indicator was found on the site, see
// its own comment) — this is not a real signal, so the capability says so.
export const CAPABILITIES: ConnectorCapabilities = {
  supportsRealtime: true,
  supportsSearch: false,
  supportsPagination: true,
  supportsImages: true,
  supportsBrands: true,
  supportsCategories: true,
  supportsStock: false,
  supportsExchange: true,
  supportsStructuredData: false,
  supportsCanonicalMatching: true,
};
