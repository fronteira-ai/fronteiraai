import type { KnowledgeRecord } from "../domain/KnowledgeRecord";

/** Minutes an operator spends on one manual brand/category review — an
 * explicit, documented ASSUMPTION used only to turn "corrections avoided"
 * into a time estimate, never claimed as measured. Change this constant,
 * never fabricate a measured value elsewhere. */
export const ASSUMED_MINUTES_PER_MANUAL_REVIEW = 2;

export interface KnowledgeReport {
  /** Distinct knowledgeKeys with at least one confirmed version — every
   * one of these is a piece of knowledge that will never need to be
   * rediscovered from scratch. */
  knowledgeCreated: number;
  /** Sum, across every key's LATEST version, of (occurrences - 1) — every
   * occurrence beyond the first is one time the same confirmed knowledge
   * was observed again instead of needing rediscovery. */
  knowledgeReused: number;
  /** From the real fan-out PendingReviewResolutionService already performs
   * (resolving one review resolves every OTHER pending review sharing the
   * same store+field+rawValue in the same pass) — count of resolved
   * reviews that were the 2nd+ member of such a group. A real, already-
   * happened number, not a projection. */
  correctionsAutomated: number;
  /** Same count as `correctionsAutomated` — the same fact framed as "a
   * human never had to look at this one separately." Reported as its own
   * field because the mission asks for both framings explicitly. */
  humanCorrectionsAvoided: number;
  /** humanCorrectionsAvoided * ASSUMED_MINUTES_PER_MANUAL_REVIEW — an
   * ESTIMATE built on a documented assumption, never a measured duration. */
  timeSavedMinutes: number;
  /** % of GLOBAL-scope knowledge keys whose full history never recorded a
   * conflict (isConflict=true on any version) before reaching its current
   * state — global promotion that was never contradicted. 100 when there
   * is no global knowledge yet (explicitly not "no data available" — an
   * honest vacuous truth, called out by the caller when total is 0). */
  precisionPercent: number;
  /** Count of individual versions appended with isConflict=true — a real,
   * structural count, never inferred from text. */
  conflicts: number;
  /** Count of knowledgeKeys whose latest resolvedValue differs from their
   * very first (version 1) resolvedValue — net drift over the full
   * history, distinct from `conflicts` (a conflict is a disagreement
   * detected AT THE TIME; a reversal is the confirmed value having
   * actually changed by the end of the observed history). */
  reversals: number;
  globalKnowledgeCount: number;
  localKnowledgeCount: number;
}

export interface ResolvedReviewGroupKey {
  storeId: string;
  fieldType: string;
  rawValue: string;
}

function latestPerKey(history: KnowledgeRecord[]): KnowledgeRecord[] {
  const byKey = new Map<string, KnowledgeRecord>();
  for (const rec of history) {
    const current = byKey.get(rec.knowledgeKey);
    if (!current || rec.version > current.version) byKey.set(rec.knowledgeKey, rec);
  }
  return [...byKey.values()];
}

function groupByKey(history: KnowledgeRecord[]): Map<string, KnowledgeRecord[]> {
  const groups = new Map<string, KnowledgeRecord[]>();
  for (const rec of history) {
    const list = groups.get(rec.knowledgeKey) ?? [];
    list.push(rec);
    groups.set(rec.knowledgeKey, list);
  }
  return groups;
}

/** Pure — takes the FULL version history (every row, every version, for
 * every knowledgeKey) plus the real resolved-review rows (for
 * `correctionsAutomated`/`humanCorrectionsAvoided`, sourced from
 * catalog_pending_reviews, a different domain's table — read by the caller,
 * never by this service). No I/O here, same discipline as ConfidenceEngine. */
export function buildKnowledgeReport(fullHistory: KnowledgeRecord[], resolvedReviews: ResolvedReviewGroupKey[]): KnowledgeReport {
  const groups = groupByKey(fullHistory);
  const latest = latestPerKey(fullHistory);

  const knowledgeCreated = groups.size;
  const knowledgeReused = latest.reduce((sum, r) => sum + Math.max(r.occurrences - 1, 0), 0);
  const conflicts = fullHistory.filter((r) => r.isConflict).length;

  let reversals = 0;
  for (const versions of groups.values()) {
    if (versions.length < 2) continue;
    const sorted = [...versions].sort((a, b) => a.version - b.version);
    if (sorted[0].resolvedValue !== sorted[sorted.length - 1].resolvedValue) reversals++;
  }

  const globalLatest = latest.filter((r) => r.scope === "global");
  const globalKeysWithoutConflict = globalLatest.filter((r) => !(groups.get(r.knowledgeKey) ?? []).some((v) => v.isConflict)).length;
  const precisionPercent = globalLatest.length === 0 ? 100 : (globalKeysWithoutConflict / globalLatest.length) * 100;

  const reviewGroups = new Map<string, number>();
  for (const review of resolvedReviews) {
    const key = `${review.storeId}:${review.fieldType}:${review.rawValue}`;
    reviewGroups.set(key, (reviewGroups.get(key) ?? 0) + 1);
  }
  let correctionsAutomated = 0;
  for (const count of reviewGroups.values()) {
    if (count > 1) correctionsAutomated += count - 1;
  }

  return {
    knowledgeCreated,
    knowledgeReused,
    correctionsAutomated,
    humanCorrectionsAvoided: correctionsAutomated,
    timeSavedMinutes: correctionsAutomated * ASSUMED_MINUTES_PER_MANUAL_REVIEW,
    precisionPercent,
    conflicts,
    reversals,
    globalKnowledgeCount: globalLatest.length,
    localKnowledgeCount: latest.length - globalLatest.length,
  };
}

/** Given the current accumulated knowledge (latest-per-key) and a set of
 * still-PENDING catalog_pending_reviews, counts how many of those pending
 * cases already have a confirmed answer on file — the honest, forward-
 * looking version of "Pending Reviews evitados": these specific backlog
 * items would never need to be re-raised once whatever created them
 * (a historical bug, a one-off parser gap) runs again, because the
 * correction is already known. Never claims reviews that HAVEN'T happened
 * yet would be avoided — only measures the real, current backlog. */
export function countPendingReviewsAlreadyKnown(
  pendingReviews: ResolvedReviewGroupKey[],
  latestLocalKnowledge: KnowledgeRecord[]
): number {
  const known = new Set(latestLocalKnowledge.filter((r) => r.scope === "local").map((r) => `${r.storeId}:${r.knowledgeType}:${r.rawValue}`));
  let count = 0;
  for (const review of pendingReviews) {
    if (known.has(`${review.storeId}:${review.fieldType}:${review.rawValue}`)) count++;
  }
  return count;
}
