export interface MarketplaceMetricsSnapshot {
  stores: number;
  products: number;
  offers: number;
  canonicalProducts: number;
  brands: number;
  categories: number;
  coveragePct: number;
  syncsPerHour: number;
  priceUpdatesPerHour: number;
  claimRate: number;
  buyerSessions: number;
  buyerEvents: number;
  brainEvents: number;
  // Knowledge Graph relations are derived per-merchant on read
  // (KnowledgeGraphService.deriveRelationsFromEvent, Release 1.5), never
  // persisted as a marketplace-wide count — aggregating it here would mean
  // iterating every merchant's graph on every dashboard load. Documented gap
  // (docs/engineering/TECH_DEBT.md), not fabricated as a number.
  knowledgeRelations: number | null;
  generatedAt: string;
}
