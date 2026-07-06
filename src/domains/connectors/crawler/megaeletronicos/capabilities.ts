import type { ConnectorCapabilities } from "../../types/capability.types";

// Declared honestly from live audit (Program D — Wave 1): unlike Shopping
// China, megaeletronicos.com's product page has a real stock indicator
// ("Em estoque" / other), so supportsStock is true here.
export const CAPABILITIES: ConnectorCapabilities = {
  supportsRealtime: true,
  supportsSearch: false,
  supportsPagination: true,
  supportsImages: true,
  supportsBrands: true,
  supportsCategories: true,
  supportsStock: true,
  supportsExchange: true,
  supportsStructuredData: false,
  supportsCanonicalMatching: true,
};
