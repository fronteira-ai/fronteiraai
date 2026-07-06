/**
 * Connector Platform V2 (Wave 5) — Observability types. Same split as
 * certification/types.ts: this domain owns the vocabulary, the real
 * cross-domain composition lives in `lib/connector-observability-service.ts`
 * (marketplace-operations already depends on connectors — connectors can't
 * depend back on it or on catalog-intelligence/realtime-commerce without a
 * cycle for the ones that also point the other way).
 */
export interface ConnectorObservabilitySnapshot {
  connectorId: string;
  storeId: string;
  storeSlug: string;
  status: string | null;
  lastSyncAt: string | null;
  lastStatus: string | null;
  /** `totals.received` from the most recent `connector_sync_runs` row —
   * items the last sync actually attempted, not the whole catalog. `null`
   * when no sync run exists yet. */
  productsProcessedLastSync: number | null;
  /** Distinct products with at least one `market_changes` row in the
   * observability window (Wave 6 — see `OBSERVABILITY_WINDOW_HOURS` in
   * lib/connector-observability-service.ts). */
  productsChanged: number;
  /** Same window, counting distinct offer-level change entities. */
  offersChanged: number;
  /** `totals.failed` from the most recent sync run — a single run's
   * failures, distinct from `errorRate` below (a sampled rate across the
   * last 20 runs). `null` when no sync run exists yet. */
  failuresLastSync: number | null;
  productsImported: number | null;
  offersImported: number;
  categories: number;
  brands: number;
  imagesCoveragePct: number;
  latencySeconds: number | null;
  errorRate: number;
  /** Not tracked anywhere today — HttpFetchStrategy retries in-process but
   * emits no persisted counter. `null`, never a fabricated 0. */
  retryCount: null;
  freshnessScore: number;
  /** Average VolatilityEngine score across a bounded sample of this store's
   * products (see lib/connector-observability-service.ts for the cap) —
   * `null` when the store has no products with enough price history yet. */
  volatilityScore: number | null;
  healthScore: number;
  /** Same composite as ConnectorQualityScore.score (certification/types.ts)
   * — repeated here so one call to the Observability snapshot carries it,
   * without forcing a caller to also call the Certification service. */
  qualityScore: number | null;
  generatedAt: string;
}
