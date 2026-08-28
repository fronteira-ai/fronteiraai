import type { ConnectorCapabilities } from "../../types/capability.types";

// Declared from the verified Shopify JSON-LD: price, currency, availability,
// image and brand are all server-rendered → supportsStock true (availability
// InStock/OutOfStock present); structured data = JSON-LD (true).
export const CAPABILITIES: ConnectorCapabilities = {
  supportsRealtime: true,
  supportsSearch: false,
  supportsPagination: true,
  supportsImages: true,
  supportsBrands: true,
  supportsCategories: false, // Shopify JSON-LD has no clean category breadcrumb
  supportsStock: true,
  supportsExchange: true,
  supportsStructuredData: true, // application/ld+json Product
  supportsCanonicalMatching: true,
};
