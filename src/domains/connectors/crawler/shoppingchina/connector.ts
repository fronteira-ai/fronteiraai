import type { IConnector, ConnectorMetadata, ConnectorFetchOptions } from "../../types/connector.types";
import type { ConnectorBatch } from "../../types/raw.types";
import { ConnectorType } from "../../types/enums";
import { HttpFetchStrategy, RateLimitedFetchStrategy, SitemapCrawler } from "../../sdk";
import { DeltaEngine } from "../../delta";
import { SupabaseDeltaStateRepository } from "../../infrastructure/SupabaseDeltaStateRepository";
import type { DeltaStateEntry } from "../../repositories/IDeltaStateRepository";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { isProductUrl, parseProductUrl } from "./listing-parser";
import { parseDetailPage } from "./detail-parser";
import { SHOPPING_CHINA_CONFIG as CFG } from "./config";
import { CAPABILITIES } from "./capabilities";

const FALLBACK_CATEGORY_NAME = "Geral";

// Wave 4 (Connector Tier 1 implementation) — recertified to use the site's
// real sitemap instead of 3 hardcoded categories with a fixed product cap
// (the Wave 3 audit's known gap, `docs/marketplace/Tier1_Merchants.md` §5.1).
// Category name per product now comes from each product page's own
// breadcrumb (parseDetailPage already does this) rather than a config
// value — more accurate than a single name shared by an entire hardcoded
// category bucket.
// Wave 5 (Connector Platform V2) — politeness delay moved from an inline
// `sleep()` per connector to the SDK's `RateLimitedFetchStrategy`; product
// discovery now goes through `sdk/sitemap` instead of a domain-local copy.
// Wave 6 (Program B — Wave 2, Connector Platform Finalization) — Delta
// Import Engine wired for real: `connector_url_snapshots` (new table) lets
// this connector skip refetching a product detail page whose sitemap
// `<lastmod>` hasn't moved since the last successful sync. The snapshot
// repository is constructed lazily inside `fetch()` (not injected via the
// constructor) because `IConnector` instances self-register at module load
// time, in `crawler/bootstrap.ts`, before any Supabase client exists —
// `getSupabaseServiceClient()` is safe to call anytime (env-based, no
// per-request state), so this needs no change to the `IConnector` contract.
// Program Σ — Mission Σ-2 — the planner/repository used here were
// generalized out of the Sitemap Engine into the platform-level Delta
// Engine (`../../delta`, `IDeltaStateRepository`) — same algorithm, same
// storage, only the vocabulary changed (url/lastmod -> key/checkpoint at
// the domain boundary; storage columns unchanged, no migration). Behavior
// for this connector is unchanged.
export class ShoppingChinaConnector implements IConnector {
  readonly metadata: ConnectorMetadata = {
    id: CFG.connectorId,
    name: "Shopping China",
    version: CFG.connectorVersion,
    type: ConnectorType.Crawler,
    storeSlug: CFG.storeSlug,
    description: "Conector oficial para shoppingchina.com.py — eletrônicos, informática e catálogo geral",
    capabilities: CAPABILITIES,
  };

  private readonly fetcher = new RateLimitedFetchStrategy(new HttpFetchStrategy(), CFG.requestDelayMs);
  private readonly sitemapCrawler = new SitemapCrawler(this.fetcher);
  private readonly deltaEngine = new DeltaEngine();

  async fetch(options: ConnectorFetchOptions = {}): Promise<ConnectorBatch> {
    const fetchedAt = new Date().toISOString();
    const allOffers: ConnectorBatch["items"] = [];

    const deltaStateRepo = new SupabaseDeltaStateRepository(getSupabaseServiceClient());
    const previousCheckpoints = await deltaStateRepo.getCheckpoints(CFG.connectorId);

    const entries = await this.sitemapCrawler.collectEntries(CFG.sitemapUrl, {
      timeoutMs: CFG.timeoutMs,
      filter: isProductUrl,
    });

    const candidates = entries.map((e) => ({ key: e.url, checkpoint: e.lastmod }));
    const plan = this.deltaEngine.plan(candidates, previousCheckpoints);
    console.log(
      `[ShoppingChina] Sitemap yielded ${entries.length} product URLs — Delta Import: ${plan.toFetch.length} to fetch, ${plan.skipped.length} skipped (unchanged since last sync)`
    );

    const checkpointByUrl = new Map(entries.map((e) => [e.url, e.lastmod]));
    const toFetch = plan.toFetch.slice(0, CFG.maxProducts);
    const fetchedSnapshots: DeltaStateEntry[] = [];

    for (const url of toFetch) {
      const parsed = parseProductUrl(url);
      if (!parsed) continue;

      const detailResult = await this.fetcher.fetch(parsed.url, { timeoutMs: CFG.timeoutMs });
      if (!detailResult.ok) {
        console.warn(`[ShoppingChina] Failed to fetch product ${parsed.url}: ${detailResult.error}`);
        continue;
      }

      const { offer, error } = parseDetailPage(
        detailResult.html,
        parsed.url,
        CFG.storeSlug,
        FALLBACK_CATEGORY_NAME,
        parsed.externalId
      );

      if (offer) {
        allOffers.push(offer);
        // Only a URL that was actually fetched AND parsed successfully gets
        // its checkpoint recorded — a failed fetch/parse must stay eligible
        // for retry next run, never silently marked "seen".
        const checkpoint = checkpointByUrl.get(url);
        if (checkpoint) fetchedSnapshots.push({ key: url, checkpoint });
      } else {
        console.warn(`[ShoppingChina] Parse error for ${parsed.url}: ${error}`);
      }
    }

    // Snapshot every successfully-processed URL this run, plus every URL the
    // engine already confirmed unchanged (their stored checkpoint is still
    // correct — re-saving just refreshes last_fetched_at bookkeeping).
    const skippedSnapshots: DeltaStateEntry[] = plan.skipped
      .map((url) => ({ key: url, checkpoint: checkpointByUrl.get(url) }))
      .filter((e): e is DeltaStateEntry => !!e.checkpoint);

    // Dry-run never writes — same invariant CatalogWriteStage/
    // MarketChangeDetectionStage already enforce, extended to this
    // connector's own side effect via ConnectorFetchOptions.dryRun.
    if (!options.dryRun) {
      await deltaStateRepo.saveCheckpoints(CFG.connectorId, [...fetchedSnapshots, ...skippedSnapshots]);
    }

    return {
      connectorId: CFG.connectorId,
      connectorVersion: CFG.connectorVersion,
      fetchedAt,
      items: allOffers,
    };
  }
}
