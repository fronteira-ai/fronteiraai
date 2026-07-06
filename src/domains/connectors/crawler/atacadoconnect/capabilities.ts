import type { ConnectorCapabilities } from "../../types/capability.types";

// Declared honestly from live audit (Program D — Wave 1): atacadoconnect.com
// emits a full schema.org Product JSON-LD block, the strongest structured-
// data signal of all 4 sitemap-driven connectors so far.
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
