import type { IKnowledgeRepository } from "../repositories/IKnowledgeRepository";
import { computeConfidence, hasChanged, isConflict, knowledgeKeyFor, nextVersion } from "../domain/ConfidenceEngine";
import { GLOBAL_MIN_INDEPENDENT_STORES, LEARNING_ENGINE_ALGORITHM_VERSION } from "../types/enums";
import type { KnowledgeType } from "../types/enums";
import type { IngestionOutcome, KnowledgeRecordInput } from "../types/knowledge-engine.types";

/** CONFIDENCE_ENGINE.md §3 / PATTERN_LEARNING.md §Objetivo 6's global-
 * promotion branch, implemented — the piece MarketplaceMemoryService's own
 * docstring named "pattern-recurrence promotion... a future Mission".
 *
 * Runs AFTER KnowledgeIngestionService has appended/updated "local"
 * records — never during ingestion itself (a single store's confirmation
 * can never satisfy "2+ merchants independentes" by construction, so
 * checking on every single ingest would just waste a read). Callers
 * (the backfill/validation scripts) invoke `evaluate` once per distinct
 * (knowledgeType, resolvedValue) pair touched in a run, after ingestion
 * finishes for that batch.
 *
 * Never touches Sync Pipeline/Firewall/Product Identity — this is a pure
 * read of `knowledge_history`'s own local records plus one append to the
 * same table. No other domain's table is read or written here. */
export class GlobalPromotionEngine {
  constructor(private readonly repo: IKnowledgeRepository) {}

  async evaluate(knowledgeType: KnowledgeType, resolvedValue: string): Promise<IngestionOutcome | { kind: "not-eligible"; distinctStoreCount: number }> {
    const localRecords = await this.repo.findLocalByTypeAndResolvedValue(knowledgeType, resolvedValue);
    const distinctStores = new Set(localRecords.map((r) => r.storeId).filter((id): id is string => id !== null));

    if (distinctStores.size < GLOBAL_MIN_INDEPENDENT_STORES) {
      return { kind: "not-eligible", distinctStoreCount: distinctStores.size };
    }

    const knowledgeKey = knowledgeKeyFor(knowledgeType, "global", null, resolvedValue);
    const latest = await this.repo.findLatestByKey(knowledgeKey);

    const totalOccurrences = localRecords.reduce((sum, r) => sum + r.occurrences, 0);
    const next = {
      resolvedValue,
      scope: "global" as const,
      confidence: computeConfidence("global", totalOccurrences),
      occurrences: totalOccurrences,
      distinctStoreCount: distinctStores.size,
    };

    if (!hasChanged(latest, next)) return { kind: "unchanged", knowledgeKey };

    const conflict = isConflict(latest, resolvedValue);
    const version = nextVersion(latest);
    const contributingStores = [...distinctStores].join(", ");
    const reason = conflict
      ? `CONFLITO: promoção global anterior "${latest!.resolvedValue}" (v${latest!.version}) divergente — nova versão registrada, nada sobrescrito`
      : `Promovido a GLOBAL: "${resolvedValue}" confirmado independentemente em ${distinctStores.size} lojas (${contributingStores}) — evidência de que não é um acidente de um único merchant (PATTERN_LEARNING.md §Objetivo 6)`;

    const input: KnowledgeRecordInput = {
      knowledgeKey,
      knowledgeType,
      scope: "global",
      storeId: null,
      rawValue: resolvedValue,
      resolvedValue,
      confidence: next.confidence,
      occurrences: totalOccurrences,
      distinctStoreCount: distinctStores.size,
      sourceSystem: "pending_review_resolution",
      sourceId: null,
      reason,
      isConflict: conflict,
      algorithmVersion: LEARNING_ENGINE_ALGORITHM_VERSION,
    };
    await this.repo.append(input, version);

    if (conflict) return { kind: "conflict", knowledgeKey, previousValue: latest!.resolvedValue, incomingValue: resolvedValue };
    return latest ? { kind: "versioned", knowledgeKey, fromConfidence: latest.confidence, toConfidence: next.confidence } : { kind: "created", knowledgeKey };
  }
}
