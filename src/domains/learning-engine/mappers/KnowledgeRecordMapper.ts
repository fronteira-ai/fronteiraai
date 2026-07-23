import type { FactConfidence } from "@/src/domains/marketplace-memory";
import type { KnowledgeRecord } from "../domain/KnowledgeRecord";
import type { KnowledgeScope, KnowledgeSourceSystem, KnowledgeType } from "../types/enums";
import type { KnowledgeRecordInput } from "../types/knowledge-engine.types";

export const KnowledgeRecordMapper = {
  toDomain(row: Record<string, unknown>): KnowledgeRecord {
    return {
      id: row.id as string,
      knowledgeKey: row.knowledge_key as string,
      knowledgeType: row.knowledge_type as KnowledgeType,
      scope: row.scope as KnowledgeScope,
      storeId: (row.store_id as string | null) ?? null,
      rawValue: row.raw_value as string,
      resolvedValue: row.resolved_value as string,
      confidence: row.confidence as FactConfidence,
      occurrences: row.occurrences as number,
      distinctStoreCount: row.distinct_store_count as number,
      version: row.version as number,
      sourceSystem: row.source_system as KnowledgeSourceSystem,
      sourceId: (row.source_id as string | null) ?? null,
      reason: row.reason as string,
      isConflict: Boolean(row.is_conflict),
      algorithmVersion: row.algorithm_version as string,
      createdAt: row.created_at as string,
    };
  },

  toRow(input: KnowledgeRecordInput, version: number): Record<string, unknown> {
    return {
      knowledge_key: input.knowledgeKey,
      knowledge_type: input.knowledgeType,
      scope: input.scope,
      store_id: input.storeId,
      raw_value: input.rawValue,
      resolved_value: input.resolvedValue,
      confidence: input.confidence,
      occurrences: input.occurrences,
      distinct_store_count: input.distinctStoreCount,
      version,
      source_system: input.sourceSystem,
      source_id: input.sourceId,
      reason: input.reason,
      is_conflict: input.isConflict,
      algorithm_version: input.algorithmVersion,
    };
  },
};
