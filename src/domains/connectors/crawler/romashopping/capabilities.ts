import type { ConnectorCapabilities } from "../../types/capability.types";

// Declared honestly from live audit (Program D — Wave 1): romapy.com emits
// real Open Graph product structured data (price/currency/availability) —
// the strongest signal of any of the 4 sitemap-driven connectors so far.
export const CAPABILITIES: ConnectorCapabilities = {
  supportsRealtime: true,
  supportsSearch: false,
  supportsPagination: true,
  supportsImages: true,
  supportsBrands: true,
  supportsCategories: true,
  supportsStock: true,
  supportsExchange: true,
  supportsStructuredData: true,
  supportsCanonicalMatching: true,
};
