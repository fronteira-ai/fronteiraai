/**
 * Connector Platform V2 (Release 1.8 — Program A — Wave 5). A static,
 * declared-by-the-author fact about what a connector's *current
 * implementation* actually provides to the platform — never computed from
 * observed data (that's `ConnectorHealthSummary`/`ConnectorQualityScore`,
 * which measure how well the connector performs, not what it's designed to
 * do). Declared honestly: a capability is `true` only when the connector's
 * own parsing logic genuinely produces that data today, not when the
 * source website theoretically could support it.
 *
 * Consumed today by `ConnectorRegistry.findByCapability` (§ registry query
 * enhancements) and reserved for the Brain (per the Wave 5 brief) to weight
 * recommendations/trust by what a connector's data can actually back up —
 * not wired to Brain yet, see docs/engineering/CONNECTOR_PLATFORM_V2.md.
 */
export interface ConnectorCapabilities {
  /** Feeds Real-Time Commerce (Change Detection/Freshness/Volatility) with
   * a sync cadence tight enough to be meaningful — not just "runs a cron". */
  supportsRealtime: boolean;
  /** Connector can look up a single product/term against the source (vs.
   * only bulk enumeration) — none of this Wave's connectors do. */
  supportsSearch: boolean;
  /** Connector correctly walks a multi-page/paginated source (sitemap
   * index, paginated listing, etc.) instead of assuming a single page. */
  supportsPagination: boolean;
  supportsImages: boolean;
  supportsBrands: boolean;
  supportsCategories: boolean;
  /** `inStock`/`stockQuantity` are populated from a real signal in the
   * source, not a hardcoded default. */
  supportsStock: boolean;
  /** Offer currency is populated accurately enough for
   * `AutomaticCurrencyService` to convert meaningfully. */
  supportsExchange: boolean;
  /** Connector parses schema.org/JSON-LD or another structured-data feed
   * instead of only HTML-text heuristics. */
  supportsStructuredData: boolean;
  /** Product data (name/brand/category/specs) is complete enough to
   * participate in Product Identity resolution (Canonical Catalog),
   * even if only in Shadow Mode today. */
  supportsCanonicalMatching: boolean;
}
