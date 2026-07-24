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
  /** Mission Ω-Gatekeeper (Catalog Integrity Firewall). Only meaningful
   * when concept is "brand" or "category": the canonical VALUE a human
   * confirmed this raw text represents (e.g. rawKey="Apple Inc" ->
   * resolvedValue="Apple") — as opposed to `concept` itself, which only
   * classifies WHAT KIND of thing rawKey is. Null for every pre-existing
   * use of this table (spec-key -> concept mapping), and for any brand/
   * category pattern not yet confirmed by an operator. */
  resolvedValue: string | null;
}
