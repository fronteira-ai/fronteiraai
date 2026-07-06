import type { IConnector, ConnectorMetadata, ConnectorFetchOptions } from "../../types/connector.types";
import type { ConnectorBatch } from "../../types/raw.types";
import { ConnectorType } from "../../types/enums";
import { HttpFetchStrategy, RateLimitedFetchStrategy, SitemapCrawler, DeltaImportPlanner } from "../../sdk";
import { SupabaseConnectorUrlSnapshotRepository } from "../../infrastructure/SupabaseConnectorUrlSnapshotRepository";
import type { UrlSnapshotEntry } from "../../repositories/IConnectorUrlSnapshotRepository";
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
  private readonly deltaPlanner = new DeltaImportPlanner();

  async fetch(options: ConnectorFetchOptions = {}): Promise<ConnectorBatch> {
    const fetchedAt = new Date().toISOString();
    const allOffers: ConnectorBatch["items"] = [];

    const snapshotRepo = new SupabaseConnectorUrlSnapshotRepository(getSupabaseServiceClient());
    const previousSnapshots = await snapshotRepo.getSnapshotMap(CFG.connectorId);

    const entries = await this.sitemapCrawler.collectEntries(CFG.sitemapUrl, {
      timeoutMs: CFG.timeoutMs,
      filter: isProductUrl,
    });

    const plan = this.deltaPlanner.plan(entries, previousSnapshots);
    console.log(
      `[ShoppingChina] Sitemap yielded ${entries.length} product URLs — Delta Import: ${plan.toFetch.length} to fetch, ${plan.skipped.length} skipped (unchanged since last sync)`
    );

    const lastmodByUrl = new Map(entries.map((e) => [e.url, e.lastmod]));
    const toFetch = plan.toFetch.slice(0, CFG.maxProducts);
    const fetchedSnapshots: UrlSnapshotEntry[] = [];

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
        // its lastmod recorded — a failed fetch/parse must stay eligible for
        // retry next run, never silently marked "seen".
        const lastmod = lastmodByUrl.get(url);
        if (lastmod) fetchedSnapshots.push({ url, lastmod });
      } else {
        console.warn(`[ShoppingChina] Parse error for ${parsed.url}: ${error}`);
      }
    }

    // Snapshot every successfully-processed URL this run, plus every URL the
    // planner already confirmed unchanged (their stored lastmod is still
    // correct — re-saving just refreshes last_fetched_at bookkeeping).
    const skippedSnapshots: UrlSnapshotEntry[] = plan.skipped
      .map((url) => ({ url, lastmod: lastmodByUrl.get(url) }))
      .filter((e): e is UrlSnapshotEntry => !!e.lastmod);

    // Dry-run never writes — same invariant CatalogWriteStage/
    // MarketChangeDetectionStage already enforce, extended to this
    // connector's own side effect via ConnectorFetchOptions.dryRun.
    if (!options.dryRun) {
      await snapshotRepo.saveSnapshots(CFG.connectorId, [...fetchedSnapshots, ...skippedSnapshots]);
    }

    return {
      connectorId: CFG.connectorId,
      connectorVersion: CFG.connectorVersion,
      fetchedAt,
      items: allOffers,
    };
  }
}
