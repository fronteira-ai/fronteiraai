import type { LearnedFact } from "../domain/LearnedFact";
import type { FactConfidence, FactOrigin, FactSource, FactType, ValidationStatus } from "../types/enums";

/** DB row <-> domain entity, isolated from SupabaseLearnedFactRepository so
 * the mapping itself is independently testable (Objetivo 8 — unit tests). */
export const LearnedFactMapper = {
  toDomain(row: Record<string, unknown>): LearnedFact {
    return {
      id: row.id as string,
      canonicalProductId: row.canonical_product_id as string,
      factType: row.fact_type as FactType,
      factValue: row.fact_value as string,
      confidence: row.confidence as FactConfidence,
      source: row.source as FactSource,
      extractedFrom: (row.extracted_from as string | null) ?? null,
      merchantId: (row.merchant_id as string | null) ?? null,
      origin: row.origin as FactOrigin,
      validationStatus: row.validation_status as ValidationStatus,
      algorithmVersion: row.algorithm_version as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  },

  toRow(input: {
    canonicalProductId: string;
    factType: FactType;
    factValue: string;
    confidence: FactConfidence;
    source: FactSource;
    extractedFrom: string | null;
    merchantId: string | null;
    origin: FactOrigin;
    algorithmVersion: string;
  }): Record<string, unknown> {
    return {
      canonical_product_id: input.canonicalProductId,
      fact_type: input.factType,
      fact_value: input.factValue,
      confidence: input.confidence,
      source: input.source,
      extracted_from: input.extractedFrom,
      merchant_id: input.merchantId,
      origin: input.origin,
      algorithm_version: input.algorithmVersion,
      updated_at: new Date().toISOString(),
    };
  },
};
