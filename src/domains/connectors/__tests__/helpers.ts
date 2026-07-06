import type { RawOffer } from "../types/raw.types";
import type { NormalizedOffer } from "../types/pipeline.types";
import type { ConnectorMetadata } from "../types/connector.types";
import type { ConnectorCapabilities } from "../types/capability.types";
import { ConnectorType } from "../types/enums";

const TEST_CAPABILITIES: ConnectorCapabilities = {
  supportsRealtime: false,
  supportsSearch: false,
  supportsPagination: false,
  supportsImages: false,
  supportsBrands: false,
  supportsCategories: false,
  supportsStock: false,
  supportsExchange: false,
  supportsStructuredData: false,
  supportsCanonicalMatching: false,
};

export function makeRawOffer(overrides: Partial<RawOffer> = {}): RawOffer {
  return {
    product: { name: "Test Product", brand: "TestBrand", category: "TestCategory" },
    storeSlug: "test-store",
    priceUSD: 99.99,
    inStock: true,
    ...overrides,
  };
}

export function makeConnectorMetadata(overrides: Partial<ConnectorMetadata> = {}): ConnectorMetadata {
  return {
    id: "test-connector",
    name: "Test Connector",
    version: "1.0",
    type: ConnectorType.JsonFile,
    storeSlug: "test-store",
    capabilities: TEST_CAPABILITIES,
    ...overrides,
  };
}

export function makeNormalizedOffer(overrides: Partial<NormalizedOffer> = {}): NormalizedOffer {
  const raw = makeRawOffer();
  return {
    raw,
    product: {
      name: "Test Product",
      slug: "test-product",
      description: "",
      brandName: "TestBrand",
      brandSlug: "testbrand",
      categoryName: "TestCategory",
      categorySlug: "testcategory",
      imageUrl: null,
      specifications: {},
    },
    offer: {
      storeSlug: "test-store",
      priceUSD: 99.99,
      priceBRL: null,
      oldPriceUSD: null,
      inStock: true,
      stockQuantity: null,
      condition: null,
      warranty: null,
      cashback: null,
      productUrl: null,
      currency: "USD",
    },
    resolvedImageUrl: null,
    ...overrides,
  };
}
