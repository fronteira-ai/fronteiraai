import type { FactConfidence, FactOrigin, FactSource, FactType, PatternConcept } from "./enums";

/** Input shape for creating/updating a fact — everything a caller provides;
 * id/createdAt/updatedAt/validationStatus are assigned by the repository. */
export interface LearnedFactInput {
  canonicalProductId: string;
  factType: FactType;
  factValue: string;
  confidence: FactConfidence;
  source: FactSource;
  extractedFrom: string | null;
  merchantId: string | null;
  origin: FactOrigin;
  algorithmVersion: string;
}

export interface MerchantAttributePatternInput {
  storeId: string;
  rawKey: string;
  concept: PatternConcept;
  confidence: FactConfidence;
  algorithmVersion: string;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}
