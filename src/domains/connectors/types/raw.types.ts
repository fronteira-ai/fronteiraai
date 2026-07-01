export interface RawProduct {
  externalId?: string;
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  specifications?: Record<string, string>;
}

export interface RawOffer {
  product: RawProduct;
  storeSlug: string;
  priceUSD: number;
  priceBRL?: number | null;
  oldPriceUSD?: number | null;
  inStock?: boolean;
  stockQuantity?: number | null;
  condition?: string | null;
  warranty?: string | null;
  cashback?: number | null;
  productUrl?: string | null;
  currency?: string;
}

export interface ConnectorBatch {
  connectorId: string;
  connectorVersion: string;
  fetchedAt: string;
  items: RawOffer[];
}
