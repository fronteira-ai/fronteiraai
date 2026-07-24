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

// Mission Ω-Pipeline (Scalable Connector Architecture). A connector that
// implements `IConnector.fetchStream` yields one RawOffer at a time instead
// of materializing the whole catalog as `ConnectorBatch.items` — the type
// SyncOrchestrator.runStream() consumes in fixed-size batches so memory
// stays bounded by batch size, never by catalog size.
export type RawOfferStream = AsyncGenerator<RawOffer, void, void>;
