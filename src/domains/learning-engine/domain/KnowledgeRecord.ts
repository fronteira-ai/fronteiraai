import type { FactConfidence } from "@/src/domains/marketplace-memory";
import type { KnowledgeScope, KnowledgeSourceSystem, KnowledgeType } from "../types/enums";

/** The Knowledge Aggregate this Mission persists — "patrimônio institucional
 * versionado" (MARKETPLACE_LEARNING_ENGINE.md §1), the same append-only
 * discipline as `merge_executions` (Program Ω): never UPDATEd, never
 * DELETEd. Every accepted change to a piece of knowledge is a NEW row with
 * `version = previous + 1`; the full history for a `knowledgeKey` is the
 * audit trail the mission's "Histórico completo" requirement asks for.
 *
 * `knowledgeKey` is the natural identity a value evolves under:
 *   - store-scoped: `${knowledgeType}:${storeId}:${rawValue}`
 *   - global:       `${knowledgeType}:global:${rawValue}`
 * Never the row's own `id` — two different `id`s legitimately share the
 * same `knowledgeKey` (that IS the version history). */
export interface KnowledgeRecord {
  id: string;
  knowledgeKey: string;
  knowledgeType: KnowledgeType;
  scope: KnowledgeScope;
  /** Null only when scope="global" — a global fact is not owned by any one
   * store anymore, same honesty rule LearnedFact.merchantId already uses
   * once a canonical product merges offers from multiple stores. */
  storeId: string | null;
  rawValue: string;
  resolvedValue: string;
  confidence: FactConfidence;
  /** Cumulative confirmed-observation count for this exact (knowledgeType,
   * storeId, rawValue) — copied from the upstream confirmed source's own
   * counter (e.g. MerchantAttributePattern.occurrences), never recomputed
   * or reset here. */
  occurrences: number;
  /** How many INDEPENDENT stores have confirmed the same (knowledgeType,
   * rawValue) -> resolvedValue mapping — the evidence
   * GLOBAL_MIN_INDEPENDENT_STORES checks against. Always 1 for a "local"
   * record; >=2 is what makes "global" reachable. */
  distinctStoreCount: number;
  /** 1-based, increases by exactly 1 per accepted change to this
   * knowledgeKey. Never reused, never decremented. */
  version: number;
  sourceSystem: KnowledgeSourceSystem;
  /** The originating confirmed row's own id (pending review id, recovery
   * decision id, merge candidate id, learned fact id) — traceability back
   * to the human decision or confirmed system that produced this version. */
  sourceId: string | null;
  /** Human-readable "why" for this exact version — mandatory per the
   * mission's "Motivo" field, never blank. */
  reason: string;
  /** True iff this version was appended because a new confirmed
   * observation disagreed with the resolvedValue the key already carried
   * — the structural signal KnowledgeObservabilityService's "Conflitos"
   * metric counts. Never inferred from `reason` text. */
  isConflict: boolean;
  algorithmVersion: string;
  createdAt: string;
}
