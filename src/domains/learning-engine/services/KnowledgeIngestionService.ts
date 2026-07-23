import type { IKnowledgeRepository } from "../repositories/IKnowledgeRepository";
import { classifyTier, computeConfidence, hasChanged, isConflict, knowledgeKeyFor, nextVersion } from "../domain/ConfidenceEngine";
import { LEARNING_ENGINE_ALGORITHM_VERSION } from "../types/enums";
import type { ConfirmedFactSource, IngestionOutcome, KnowledgeRecordInput, RecoveryDecisionSource, ResolvedPatternSource } from "../types/knowledge-engine.types";

/** The Learning Service LEARNING_LIFECYCLE.md specified
 * (Persistência -> Versionamento -> Reutilização) and MARKETPLACE_LEARNING_ENGINE.md
 * §3 named "Learning Persistence" — implemented here for real, for the
 * first time. Reads ONLY the confirmed sources the mission's "FONTES DE
 * APRENDIZADO" section allows (see types/knowledge-engine.types.ts's three
 * Source shapes) — never a pending review, never an unconfirmed extraction,
 * never a rejected value (mission's "LIMITAÇÕES", enforced by the input
 * types themselves: there is no constructor for an unconfirmed source).
 *
 * Every ingest* method is pure decision logic over ALREADY-FETCHED confirmed
 * rows + the current latest KnowledgeRecord for that key (same dependency-
 * injection discipline as BrandCategoryGatekeeper/CatalogRecoveryEngine —
 * this class never touches a SupabaseClient itself, only IKnowledgeRepository
 * for its own domain's read-before-append). Callers (the backfill script)
 * own fetching confirmed rows from the OTHER domains' own repositories —
 * this Mission never introduces a write dependency into Sync Pipeline,
 * Firewall, Catalog Recovery, or Merge Engine (explicit compatibility
 * constraint). */
export class KnowledgeIngestionService {
  constructor(private readonly repo: IKnowledgeRepository) {}

  /** Every accepted observation becomes "local" scope here — promotion to
   * "global" is never decided by this method (see GlobalPromotionEngine),
   * so a single ingestion call can never itself satisfy
   * GLOBAL_MIN_INDEPENDENT_STORES; that requires aggregating across
   * multiple stores' local records, a separate read this class does not
   * perform. */
  async ingestResolvedPattern(source: ResolvedPatternSource): Promise<IngestionOutcome> {
    if (!source.resolvedValue) {
      return { kind: "skipped-unconfirmed", reason: `pattern ${source.id} has no resolvedValue — never confirmed by an operator` };
    }

    const knowledgeKey = knowledgeKeyFor(source.concept, "local", source.storeId, source.rawKey);
    const latest = await this.repo.findLatestByKey(knowledgeKey);

    const next = {
      resolvedValue: source.resolvedValue,
      scope: "local" as const,
      confidence: computeConfidence("local", source.occurrences),
      occurrences: source.occurrences,
      distinctStoreCount: 1,
    };

    if (!hasChanged(latest, next)) return { kind: "unchanged", knowledgeKey };

    const conflict = isConflict(latest, source.resolvedValue);
    const version = nextVersion(latest);
    const reason = conflict
      ? `CONFLITO: correção anterior "${latest!.resolvedValue}" (v${latest!.version}) divergente da nova confirmação "${source.resolvedValue}" para loja ${source.storeId}, raw="${source.rawKey}" — nova versão registrada, nada sobrescrito`
      : `Correção humana confirmada para a loja ${source.storeId}: "${source.rawKey}" -> "${source.resolvedValue}" (${source.occurrences} observação(ões) confirmada(s))`;

    const input: KnowledgeRecordInput = {
      knowledgeKey,
      knowledgeType: source.concept,
      scope: "local",
      storeId: source.storeId,
      rawValue: source.rawKey,
      resolvedValue: source.resolvedValue,
      confidence: next.confidence,
      occurrences: source.occurrences,
      distinctStoreCount: 1,
      sourceSystem: "pending_review_resolution",
      sourceId: source.id,
      reason,
      isConflict: conflict,
      algorithmVersion: LEARNING_ENGINE_ALGORITHM_VERSION,
    };
    await this.repo.append(input, version);

    if (conflict) return { kind: "conflict", knowledgeKey, previousValue: latest!.resolvedValue, incomingValue: source.resolvedValue };
    return latest ? { kind: "versioned", knowledgeKey, fromConfidence: latest.confidence, toConfidence: next.confidence } : { kind: "created", knowledgeKey };
  }

  /** Recovery decisions confirm brand/category via evidence that is, by its
   * own nature, store-independent (a shared EAN/MPN, a linked canonical
   * product, Universal Taxonomy resolution, brand-name normalization) — so
   * these are ingested directly at "global" scope, never through the
   * local-recurrence path ResolvedPatternSource uses. `layer:
   * "merchant_memory"` is always skipped — see the type's own doc comment. */
  async ingestRecoveryDecision(source: RecoveryDecisionSource): Promise<IngestionOutcome> {
    const knowledgeKey = knowledgeKeyFor(source.fieldType, "global", null, source.recoveredValue);

    if (source.layer === "merchant_memory") {
      return { kind: "skipped-duplicate-source", knowledgeKey, reason: "layer=merchant_memory is already captured via ResolvedPatternSource ingestion" };
    }

    const latest = await this.repo.findLatestByKey(knowledgeKey);
    const next = {
      resolvedValue: source.recoveredValue,
      scope: "global" as const,
      confidence: source.confidence,
      occurrences: (latest?.occurrences ?? 0) + 1,
      distinctStoreCount: latest?.distinctStoreCount ?? 1,
    };

    if (!hasChanged(latest, next)) return { kind: "unchanged", knowledgeKey };

    const conflict = isConflict(latest, source.recoveredValue);
    const version = nextVersion(latest);
    const reason = conflict
      ? `CONFLITO: recuperação anterior "${latest!.resolvedValue}" (v${latest!.version}) divergente de nova recuperação "${source.recoveredValue}" via camada ${source.layer} — nova versão registrada, nada sobrescrito`
      : `Confirmado via Catalog Recovery Engine, camada ${source.layer}: ${source.evidence}`;

    const input: KnowledgeRecordInput = {
      knowledgeKey,
      knowledgeType: source.fieldType,
      scope: "global",
      storeId: null,
      rawValue: source.previousValue ?? source.recoveredValue,
      resolvedValue: source.recoveredValue,
      confidence: next.confidence,
      occurrences: next.occurrences,
      distinctStoreCount: next.distinctStoreCount,
      sourceSystem: "catalog_recovery_decision",
      sourceId: source.id,
      reason,
      isConflict: conflict,
      algorithmVersion: LEARNING_ENGINE_ALGORITHM_VERSION,
    };
    await this.repo.append(input, version);

    if (conflict) return { kind: "conflict", knowledgeKey, previousValue: latest!.resolvedValue, incomingValue: source.recoveredValue };
    return latest ? { kind: "versioned", knowledgeKey, fromConfidence: latest.confidence, toConfidence: next.confidence } : { kind: "created", knowledgeKey };
  }

  /** A confirmed LearnedFact's own `merchantId` already decides scope —
   * null (once a canonical product merged offers from multiple stores)
   * means the fact is inherently marketplace-wide, same honesty rule
   * LearnedFact.ts documents. Confidence is carried through unchanged
   * (never recomputed via recurrence — a validated extraction's confidence
   * is a property of the extraction, not of how many times it repeated). */
  async ingestConfirmedFact(source: ConfirmedFactSource): Promise<IngestionOutcome> {
    const scope = source.merchantId ? ("local" as const) : ("global" as const);
    const knowledgeKey = knowledgeKeyFor(source.factType, scope, source.merchantId, source.factValue);
    const latest = await this.repo.findLatestByKey(knowledgeKey);

    const next = {
      resolvedValue: source.factValue,
      scope,
      confidence: source.confidence,
      occurrences: latest?.occurrences ?? 1,
      distinctStoreCount: latest?.distinctStoreCount ?? 1,
    };

    if (!hasChanged(latest, next)) return { kind: "unchanged", knowledgeKey };

    const version = nextVersion(latest);
    const reason = `Fato confirmado (Marketplace Memory, validationStatus=confirmed): produto canônico ${source.canonicalProductId}, ${source.factType}="${source.factValue}"`;

    const input: KnowledgeRecordInput = {
      knowledgeKey,
      knowledgeType: source.factType,
      scope,
      storeId: source.merchantId,
      rawValue: source.factValue,
      resolvedValue: source.factValue,
      confidence: source.confidence,
      occurrences: next.occurrences,
      distinctStoreCount: next.distinctStoreCount,
      sourceSystem: "learned_fact_confirmed",
      sourceId: source.id,
      reason,
      // Structurally unreachable for this source: knowledgeKey embeds
      // factValue itself (rawValue===resolvedValue===factValue), so a
      // differing value always produces a different key, never a conflict
      // on the same key.
      isConflict: false,
      algorithmVersion: LEARNING_ENGINE_ALGORITHM_VERSION,
    };
    await this.repo.append(input, version);
    return latest ? { kind: "versioned", knowledgeKey, fromConfidence: latest.confidence, toConfidence: source.confidence } : { kind: "created", knowledgeKey };
  }
}

// Re-exported for callers that want the pure classification without going
// through ingestion (e.g. GlobalPromotionEngine, tests).
export { classifyTier };
