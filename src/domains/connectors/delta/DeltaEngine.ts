export interface DeltaCandidate {
  /** Opaque identifier for an item within its connector — a sitemap URL, an
   * API record ID, a file row key. The Delta Engine never inspects its
   * shape or origin; it only ever compares it by equality. */
  key: string;
  /** Opaque version marker for this item as of the current discovery pass —
   * a sitemap `<lastmod>`, an API `updated_at`, a content hash, anything
   * comparable by string equality. `null` means the source declares no
   * signal for this item this pass. */
  checkpoint: string | null;
}

export interface DeltaPlan {
  /** Keys to actually process this run — new, or whose checkpoint moved
   * forward since the last known state. */
  toFetch: string[];
  /** Keys skipped because their checkpoint didn't change since the last
   * known state — the entire point of the Delta Engine: avoid redoing work
   * nothing changed on. */
  skipped: string[];
}

/**
 * Connector Platform — Delta Engine (Program Σ, Mission Σ-1/Σ-2). Pure
 * progress/sync decision logic: given the current pass's candidates and a
 * snapshot of what was last known, decides what's actually worth
 * (re)processing.
 *
 * Generalized out of the Sitemap Engine (`sdk/sitemap/DeltaImportPlanner`,
 * Release 1.8 Wave 5/Program B Wave 2) — same algorithm, decoupled from
 * "sitemap"/"URL"/"lastmod" vocabulary so any discovery strategy (sitemap,
 * paginated API, feed) can feed it. This class knows nothing about HTML,
 * REST, XML, a specific connector, or any catalog/business rule — it only
 * ever sees opaque (key, checkpoint) pairs.
 *
 * A candidate with no checkpoint is always fetched — there is no signal to
 * skip on, and assuming "unchanged" without evidence would be exactly the
 * "decisão mágica" this codebase's culture rejects.
 */
export class DeltaEngine {
  plan(candidates: DeltaCandidate[], previousCheckpoints: ReadonlyMap<string, string>): DeltaPlan {
    const toFetch: string[] = [];
    const skipped: string[] = [];

    for (const candidate of candidates) {
      if (!candidate.checkpoint) {
        toFetch.push(candidate.key);
        continue;
      }

      const previous = previousCheckpoints.get(candidate.key);
      if (previous && previous === candidate.checkpoint) {
        skipped.push(candidate.key);
      } else {
        toFetch.push(candidate.key);
      }
    }

    return { toFetch, skipped };
  }
}
