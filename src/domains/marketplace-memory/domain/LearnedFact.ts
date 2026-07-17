import type { FactConfidence, FactOrigin, FactSource, FactType, ValidationStatus } from "../types/enums";

/** A single deterministic fact learned about one canonical product —
 * the Knowledge Aggregate (docs/architecture/INCREMENTAL_ARCHITECTURE_CONSTITUTION.md,
 * Article 5) persisted. Never a derived/relational result (never a match
 * score, never an opportunity value) — only what a pure extractor already
 * computes from that product's own data. */
export interface LearnedFact {
  id: string;
  canonicalProductId: string;
  factType: FactType;
  factValue: string;
  confidence: FactConfidence;
  source: FactSource;
  extractedFrom: string | null;
  /** The store whose `products` row was the real source of this specific
   * extraction, when determinable. Null is the honest value once a
   * canonical product has merged offers from multiple stores and a single
   * provenance can no longer be claimed — never guessed. */
  merchantId: string | null;
  origin: FactOrigin;
  validationStatus: ValidationStatus;
  algorithmVersion: string;
  createdAt: string;
  updatedAt: string;
}
