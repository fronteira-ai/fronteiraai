import type { IFetchStrategy } from "../sdk/fetch/IFetchStrategy";
import type { SitemapCrawler } from "../sdk/sitemap/SitemapCrawler";
import type { DeltaEngine } from "../delta/DeltaEngine";
import type { IDeltaStateRepository, DeltaStateEntry } from "../repositories/IDeltaStateRepository";
import type { RawOffer, RawOfferStream } from "../types/raw.types";

// Mission Ω-Pipeline (Scalable Connector Architecture). One real generator
// shared by every sitemap-driven connector (Atacado Connect, Mega
// Eletrônicos, Roma Shopping, Shopping China — identical shape, only the
// per-URL fetch+parse closure differs) instead of the same `allOffers: []`
// accumulation duplicated 4 times. Yields one RawOffer at a time — nothing
// here ever holds more than the current URL's parsed result in memory.
//
// Root cause this replaces: the old `connector.fetch()` accumulated every
// parsed offer AND only called `deltaStateRepo.saveCheckpoints()` once, at
// the very end, with the combined fetched+skipped list. A crash mid-run
// (as happened for real: Shopping China OOM'd after ~3h of live crawling)
// lost 100% of that run's progress — not just the in-memory offers, but
// also every checkpoint, forcing a full re-crawl from zero next time. This
// generator flushes checkpoints every `checkpointFlushEvery` items (default
// = the same batch size the orchestrator persists in), so an interruption
// at any point only ever loses the current partial batch, never the whole run.

const DEFAULT_CHECKPOINT_FLUSH_EVERY = 200;

export interface SitemapStreamDeps {
  connectorId: string;
  sitemapUrl: string;
  timeoutMs: number;
  maxProducts: number;
  dryRun: boolean;
  fetcher: IFetchStrategy;
  sitemapCrawler: SitemapCrawler;
  deltaEngine: DeltaEngine;
  deltaStateRepo: IDeltaStateRepository;
  isProductUrl: (url: string) => boolean;
  /** Fetches and parses one product URL — every connector's own
   * parseDetailPage signature differs slightly (externalId, fallback
   * category name, etc.), so this closure captures whatever that specific
   * connector needs; the streaming mechanics here stay connector-agnostic.
   * Logs its own warnings on failure (exact wording preserved per connector)
   * — this generator never re-logs, it only acts on `offer` being present. */
  fetchAndParse: (url: string) => Promise<{ offer: RawOffer | null }>;
  logPrefix: string;
  checkpointFlushEvery?: number;
}

export async function* streamSitemapConnector(deps: SitemapStreamDeps): RawOfferStream {
  const {
    connectorId,
    sitemapUrl,
    timeoutMs,
    maxProducts,
    dryRun,
    sitemapCrawler,
    deltaEngine,
    deltaStateRepo,
    isProductUrl,
    fetchAndParse,
    logPrefix,
    checkpointFlushEvery = DEFAULT_CHECKPOINT_FLUSH_EVERY,
  } = deps;

  // Small, bounded by sitemap size (URL + lastmod strings only, never a full
  // parsed offer) — this is the one structure that legitimately needs to be
  // known up front, since the Delta Engine's plan requires the full
  // candidate set to decide what changed since last run.
  const previousCheckpoints = await deltaStateRepo.getCheckpoints(connectorId);
  const entries = await sitemapCrawler.collectEntries(sitemapUrl, { timeoutMs, filter: isProductUrl });

  const candidates = entries.map((e) => ({ key: e.url, checkpoint: e.lastmod }));
  const plan = deltaEngine.plan(candidates, previousCheckpoints);
  console.log(
    `[${logPrefix}] Sitemap yielded ${entries.length} product URLs — Delta Import: ${plan.toFetch.length} to fetch, ${plan.skipped.length} skipped (unchanged since last sync)`
  );

  const checkpointByUrl = new Map(entries.map((e) => [e.url, e.lastmod]));
  const toFetch = plan.toFetch.slice(0, maxProducts);

  let pending: DeltaStateEntry[] = [];

  async function flush(entriesToFlush: DeltaStateEntry[]): Promise<void> {
    if (dryRun || entriesToFlush.length === 0) return;
    await deltaStateRepo.saveCheckpoints(connectorId, entriesToFlush);
  }

  for (const url of toFetch) {
    const { offer } = await fetchAndParse(url);

    if (offer) {
      yield offer;
      const checkpoint = checkpointByUrl.get(url);
      if (checkpoint) pending.push({ key: url, checkpoint });
    }

    if (pending.length >= checkpointFlushEvery) {
      await flush(pending);
      pending = [];
    }
  }

  // Every URL the engine already confirmed unchanged this pass — their
  // stored checkpoint is still correct, re-saving only refreshes
  // last_fetched_at bookkeeping. Flushed once at the end since these were
  // never fetched (nothing to lose by batching them together here).
  const skippedSnapshots: DeltaStateEntry[] = plan.skipped
    .map((url) => ({ key: url, checkpoint: checkpointByUrl.get(url) }))
    .filter((e): e is DeltaStateEntry => !!e.checkpoint);

  await flush([...pending, ...skippedSnapshots]);
}
