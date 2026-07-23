import type { KnowledgeRecord } from "../domain/KnowledgeRecord";
import type { KnowledgeRecordInput, PaginatedResult, PaginationParams } from "../types/knowledge-engine.types";
import type { KnowledgeScope, KnowledgeType } from "../types/enums";

export interface IKnowledgeRepository {
  /** The latest (highest version) row for a knowledgeKey — the only read a
   * caller needs before deciding whether a new observation is a no-op, a
   * new version, or a conflict. Null if the key has never been observed. */
  findLatestByKey(knowledgeKey: string): Promise<KnowledgeRecord | null>;

  /** Full version history for one knowledgeKey, oldest first — the audit
   * trail the mission's "Histórico completo" requires. */
  findHistoryByKey(knowledgeKey: string): Promise<KnowledgeRecord[]>;

  /** Every "local" record (latest version only, one per store) for a given
   * (knowledgeType, resolvedValue) pair, across all stores — grouped by the
   * CANONICAL value, not the raw spelling, because independent stores
   * legitimately write different raw text ("APPLE INC" vs "Apple Inc.")
   * for the same confirmed identity. The read GlobalPromotionEngine uses
   * to count distinct independent stores before promoting to "global". */
  findLocalByTypeAndResolvedValue(knowledgeType: KnowledgeType, resolvedValue: string): Promise<KnowledgeRecord[]>;

  /** Append-only insert — NEVER an upsert, never touches an existing row.
   * `version` is assigned by the caller (ConfidenceEngine.nextVersion),
   * passed in already computed so this method stays a pure append. */
  append(input: KnowledgeRecordInput, version: number): Promise<KnowledgeRecord>;

  findAll(pagination: PaginationParams): Promise<PaginatedResult<KnowledgeRecord>>;

  /** Latest-version rows only (one per knowledgeKey), optionally filtered —
   * the read every Observability metric is built from, never a raw table
   * scan of every historical version. */
  findLatestByScope(scope: KnowledgeScope): Promise<KnowledgeRecord[]>;
  findLatestByStore(storeId: string): Promise<KnowledgeRecord[]>;

  countDistinctKeys(): Promise<number>;
  countTotalVersions(): Promise<number>;
}
