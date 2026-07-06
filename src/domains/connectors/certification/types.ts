/**
 * Connector Platform V2 (Wave 5) — Certification Framework types.
 *
 * Deliberately just shapes, no logic and no cross-domain imports: the real
 * evidence-gathering (Catalog Intelligence, Marketplace Operations,
 * Real-Time Commerce, Exchange) has to compose services from *multiple*
 * domains, several of which already depend on `connectors/` themselves
 * (`marketplace-operations` does, via `ConnectorHealthService`) — so the
 * aggregator that reads all of them cannot live inside `connectors/`
 * without creating a circular dependency. It lives in
 * `lib/connector-certification-service.ts` instead, the same composition
 * layer every `*-factory.ts`/dashboard service in this codebase already
 * uses to wire multiple domains together. `connectors/` only owns the
 * vocabulary — what a criterion *is* — never how it's computed.
 */

export type CertificationCriterionKey =
  | "products"
  | "offers"
  | "categories"
  | "brands"
  | "images"
  | "currency"
  | "freshness"
  | "canonicalMatch"
  | "exchange"
  | "marketplaceOperations"
  | "analytics"
  | "brain"
  | "changeDetection";

export interface CertificationCriterionResult {
  key: CertificationCriterionKey;
  label: string;
  /** `null` means "not evaluated" (e.g. Analytics/Brain for an unclaimed
   * store) — never coerced to `false`, which would read as "checked and
   * failed" instead of "not computable today". */
  passed: boolean | null;
  evidence: string;
}

export interface CertificationReport {
  connectorId: string;
  storeId: string;
  storeSlug: string;
  criteria: CertificationCriterionResult[];
  /** Certified only when every criterion that *was* evaluated (excludes
   * `null`) passed — a store with no merchant link can still certify on the
   * 11 evaluable criteria; Analytics/Brain are surfaced as "not evaluated",
   * not silently ignored. */
  certified: boolean;
  evaluatedCount: number;
  passedCount: number;
  generatedAt: string;
}

export interface ConnectorQualityScoreFactors {
  /** ConnectorHealthService.healthScore — uptime + error rate, 0-100 */
  reliability: number;
  /** catalog-intelligence getHealthBreakdown average product score, 0-100 */
  completeness: number;
  /** % of this store's offers with canonical_product_id set, 0-100 */
  canonicalMatch: number;
  /** StoreUpdateIntelligenceService.avgFreshnessScore, 0-100 */
  freshness: number;
}

export interface ConnectorQualityScore {
  connectorId: string;
  storeId: string;
  score: number;
  factors: ConnectorQualityScoreFactors;
  generatedAt: string;
}
