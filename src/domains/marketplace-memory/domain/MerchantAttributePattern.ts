import type { FactConfidence, PatternConcept, ValidationStatus } from "../types/enums";

/** A merchant-specific observation: "for this store, this raw specification
 * key maps to this concept." The storage layer for Merchant Learning
 * (docs/architecture/MERCHANT_LEARNING.md) — promotion-by-recurrence logic
 * itself belongs to a future Learning Engine Mission, not built here. */
export interface MerchantAttributePattern {
  id: string;
  storeId: string;
  rawKey: string;
  concept: PatternConcept;
  confidence: FactConfidence;
  occurrences: number;
  algorithmVersion: string;
  validationStatus: ValidationStatus;
  createdAt: string;
  updatedAt: string;
}
