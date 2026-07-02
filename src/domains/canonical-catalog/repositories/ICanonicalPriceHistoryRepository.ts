export interface CanonicalPriceHistoryPoint {
  offerId: string;
  priceUSD: number;
  recordedAt: string;
}

// Price History Foundation (mission objective 10): history now belongs to
// the Canonical Product, not just the Offer — this reads across every offer
// linked to a canonical product. No new price_history table: this reuses
// the existing per-offer table (offer_id FK, unchanged since migration
// 0006) and aggregates at read time, same "computed on demand, never
// stored" convention already used by merchant-decision/catalog-intelligence.
export interface ICanonicalPriceHistoryRepository {
  findByCanonicalProductId(canonicalProductId: string): Promise<CanonicalPriceHistoryPoint[]>;
}
