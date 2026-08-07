import type { IConnector, ConnectorMetadata, ConnectorFetchOptions } from "../../types/connector.types";
import type { ConnectorBatch, RawOffer, RawOfferStream } from "../../types/raw.types";
import { ConnectorType } from "../../types/enums";
import { HttpFetchStrategy, RateLimitedFetchStrategy, SitemapCrawler } from "../../sdk";
import { DeltaEngine } from "../../delta";
import { SupabaseDeltaStateRepository } from "../../infrastructure/SupabaseDeltaStateRepository";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { streamSitemapConnector } from "../../streaming/SitemapConnectorStream";
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
// repository is constructed lazily inside fetchStream() (not injected via the
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
// Mission Ω-Pipeline — fetchStream() is the real implementation now
// (streamSitemapConnector, shared with the other 3 sitemap connectors —
// this is also the connector whose full-catalog run OOM'd in production,
// the concrete evidence this Mission responds to); fetch() is a thin
// backward-compatible wrapper that drains it into an array.
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

  fetchStream(options: ConnectorFetchOptions = {}): RawOfferStream {
    return streamSitemapConnector({
      connectorId: CFG.connectorId,
      sitemapUrl: CFG.sitemapUrl,
      timeoutMs: CFG.timeoutMs,
      maxProducts: CFG.maxProducts,
      dryRun: options.dryRun ?? false,
      fetcher: this.fetcher,
      sitemapCrawler: this.sitemapCrawler,
      deltaEngine: this.deltaEngine,
      deltaStateRepo: new SupabaseDeltaStateRepository(getSupabaseServiceClient()),
      isProductUrl,
      logPrefix: "ShoppingChina",
      fetchAndParse: async (url: string): Promise<{ offer: RawOffer | null }> => {
        const parsed = parseProductUrl(url);
        if (!parsed) return { offer: null };

        const detailResult = await this.fetcher.fetch(parsed.url, { timeoutMs: CFG.timeoutMs });
        if (!detailResult.ok) {
          console.warn(`[ShoppingChina] Failed to fetch product ${parsed.url}: ${detailResult.error}`);
          return { offer: null };
        }

        const { offer, error } = parseDetailPage(
          detailResult.html,
          parsed.url,
          CFG.storeSlug,
          FALLBACK_CATEGORY_NAME,
          parsed.externalId
        );
        if (!offer) {
          console.warn(`[ShoppingChina] Parse error for ${parsed.url}: ${error}`);
        }
        return { offer };
      },
    });
  }

  async fetch(options: ConnectorFetchOptions = {}): Promise<ConnectorBatch> {
    const fetchedAt = new Date().toISOString();
    const allOffers: RawOffer[] = [];
    for await (const offer of this.fetchStream(options)) {
      allOffers.push(offer);
    }
    return {
      connectorId: CFG.connectorId,
      connectorVersion: CFG.connectorVersion,
      fetchedAt,
      items: allOffers,
    };
  }
}
