import type { FactConfidence } from "@/src/domains/marketplace-memory";
import type { KnowledgeRecord } from "./KnowledgeRecord";
import { GLOBAL_MIN_INDEPENDENT_STORES, HIGH_CONFIDENCE_OCCURRENCE_FLOOR, LOCAL_PROMOTION_THRESHOLD } from "../types/enums";
import type { KnowledgeScope } from "../types/enums";

/** Pure, deterministic, zero I/O — the entire "aprendizagem" this Mission
 * implements is this file. PATTERN_LEARNING.md §Objetivo 6's tree, coded
 * exactly:
 *
 *   occurrences < LOCAL_PROMOTION_THRESHOLD, not human-confirmed
 *     -> "candidate" (registered, never auto-applied, never reported as
 *        reusable knowledge)
 *   occurrences >= LOCAL_PROMOTION_THRESHOLD, OR the source is itself a
 *   confirmed human correction (every KnowledgeSourceSystem this domain
 *   accepts already implies that — see types/enums.ts)
 *     -> "local" (confirmed for its own store)
 *   local AND observed independently in >= GLOBAL_MIN_INDEPENDENT_STORES
 *   stores
 *     -> "global" (confirmed marketplace-wide)
 *
 * "Sempre uma checagem de formato" (PATTERN_LEARNING.md) is already
 * enforced upstream, before this function ever sees the value: every
 * KnowledgeSourceSystem this domain reads from (PendingReviewResolutionService,
 * CatalogRecoveryEngine, BrandCategoryGatekeeper's learned-pattern layer,
 * CanonicalMergeSuggestionService) already rejects forbidden/generic/
 * malformed values before writing resolvedValue — this Engine never
 * re-validates format, it only counts and promotes. */
/** Every source this domain ingests from is, by construction, a CONFIRMED
 * correction (see KnowledgeSourceSystem) — so a brand-new observation from
 * one of these sources is never "unconfirmed noise"; it starts at "local"
 * scope immediately (occurrences=1 is enough once a human/deterministic
 * layer already confirmed it). It is promoted to "global" only once the
 * same mapping is independently confirmed in >= GLOBAL_MIN_INDEPENDENT_STORES
 * stores AND has itself recurred >= LOCAL_PROMOTION_THRESHOLD times overall
 * — recurrence alone (one store, many occurrences) is real evidence of
 * store-local confidence, never proof it generalizes marketplace-wide. */
export function classifyTier(occurrences: number, distinctStoreCount: number): KnowledgeScope {
  return distinctStoreCount >= GLOBAL_MIN_INDEPENDENT_STORES && occurrences >= LOCAL_PROMOTION_THRESHOLD ? "global" : "local";
}

export function computeConfidence(tier: KnowledgeScope, occurrences: number): FactConfidence {
  if (tier === "global") return "high";
  return occurrences >= HIGH_CONFIDENCE_OCCURRENCE_FLOOR ? "high" : "medium";
}

export function nextVersion(latest: KnowledgeRecord | null): number {
  return latest ? latest.version + 1 : 1;
}

export interface PendingKnowledgeState {
  resolvedValue: string;
  scope: KnowledgeScope;
  confidence: FactConfidence;
  occurrences: number;
  distinctStoreCount: number;
}

/** Never version a no-op — re-ingesting the same confirmed source twice
 * (e.g. re-running the backfill script) must never grow the append-only
 * history with an identical row. This is the sole gate that keeps
 * "sempre versionar" from becoming "versionar infinitamente". */
export function hasChanged(latest: KnowledgeRecord | null, next: PendingKnowledgeState): boolean {
  if (!latest) return true;
  return (
    latest.resolvedValue !== next.resolvedValue ||
    latest.scope !== next.scope ||
    latest.confidence !== next.confidence ||
    latest.occurrences !== next.occurrences ||
    latest.distinctStoreCount !== next.distinctStoreCount
  );
}

/** A conflict is a real, reportable event (Objetivo "Conflitos" in the
 * observability list) — a new confirmed observation disagreeing with the
 * resolvedValue this key already carries. Never auto-resolved by picking a
 * side (same discipline as the Firewall/Recovery Engine's own cross-layer
 * conflict handling) — the caller records BOTH the conflict and still
 * appends the new version (never overwritten, never silently dropped), so
 * the full disagreement stays in history for a human to inspect. */
export function isConflict(latest: KnowledgeRecord | null, incomingResolvedValue: string): boolean {
  return latest !== null && latest.resolvedValue !== incomingResolvedValue;
}

export function knowledgeKeyFor(knowledgeType: string, scope: KnowledgeScope, storeId: string | null, rawValue: string): string {
  return `${knowledgeType}:${scope === "global" ? "global" : storeId}:${rawValue}`;
}
