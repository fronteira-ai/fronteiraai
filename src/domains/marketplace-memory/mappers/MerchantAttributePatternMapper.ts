import type { MerchantAttributePattern } from "../domain/MerchantAttributePattern";
import type { FactConfidence, PatternConcept, ValidationStatus } from "../types/enums";

export const MerchantAttributePatternMapper = {
  toDomain(row: Record<string, unknown>): MerchantAttributePattern {
    return {
      id: row.id as string,
      storeId: row.store_id as string,
      rawKey: row.raw_key as string,
      concept: row.concept as PatternConcept,
      confidence: row.confidence as FactConfidence,
      occurrences: row.occurrences as number,
      algorithmVersion: row.algorithm_version as string,
      validationStatus: row.validation_status as ValidationStatus,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  },

  toRow(input: {
    storeId: string;
    rawKey: string;
    concept: PatternConcept;
    confidence: FactConfidence;
    algorithmVersion: string;
  }, occurrences: number): Record<string, unknown> {
    return {
      store_id: input.storeId,
      raw_key: input.rawKey,
      concept: input.concept,
      confidence: input.confidence,
      occurrences,
      algorithm_version: input.algorithmVersion,
      updated_at: new Date().toISOString(),
    };
  },
};
