import type { SitemapEntry } from "./SitemapCrawler";

export interface DeltaImportPlan {
  /** URLs to actually fetch this run — new, or `<lastmod>` moved forward. */
  toFetch: string[];
  /** URLs skipped because their `<lastmod>` didn't change since the last
   * known snapshot — the entire point of a Delta Import Engine: avoid
   * refetching a detail page nothing changed on. */
  skipped: string[];
}

/**
 * Connector SDK — Delta Import Engine (Wave 5, Connector Platform V2), pure
 * decision logic. Given the sitemap's current `<lastmod>` per URL and a
 * snapshot of what was last known, decides what's actually worth fetching.
 *
 * A URL with no `<lastmod>` in the current sitemap is always fetched — we
 * have no signal to skip on, and assuming "unchanged" without evidence would
 * be exactly the "decisão mágica" this codebase's culture rejects.
 *
 * NOT WIRED to a real connector yet: this class is pure and testable, but
 * persisting `previousLastmodByUrl` *across* real sync runs needs a small
 * new store (a `connector_url_snapshots` table or similar) that this Wave
 * did not add — no migration was authorized, and an in-memory cache would
 * reset on every cold start in a serverless cron (Vercel), providing zero
 * real benefit in production. Documented in
 * docs/engineering/CONNECTOR_PLATFORM_V2.md §5, not silently faked with an
 * in-memory cache that only looks like it works.
 */
export class DeltaImportPlanner {
  plan(currentEntries: SitemapEntry[], previousLastmodByUrl: ReadonlyMap<string, string>): DeltaImportPlan {
    const toFetch: string[] = [];
    const skipped: string[] = [];

    for (const entry of currentEntries) {
      if (!entry.lastmod) {
        toFetch.push(entry.url);
        continue;
      }

      const previous = previousLastmodByUrl.get(entry.url);
      if (previous && previous === entry.lastmod) {
        skipped.push(entry.url);
      } else {
        toFetch.push(entry.url);
      }
    }

    return { toFetch, skipped };
  }
}
