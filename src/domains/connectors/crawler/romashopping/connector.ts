import type { IConnector, ConnectorMetadata, ConnectorFetchOptions } from "../../types/connector.types";
import type { ConnectorBatch, RawOffer, RawOfferStream } from "../../types/raw.types";
import { ConnectorType } from "../../types/enums";
import { HttpFetchStrategy, RateLimitedFetchStrategy, SitemapCrawler } from "../../sdk";
import { DeltaEngine } from "../../delta";
import { SupabaseDeltaStateRepository } from "../../infrastructure/SupabaseDeltaStateRepository";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { streamSitemapConnector } from "../../streaming/SitemapConnectorStream";
import { isProductUrl } from "./listing-parser";
import { parseDetailPage } from "./detail-parser";
import { ROMA_SHOPPING_CONFIG as CFG } from "./config";
import { CAPABILITIES } from "./capabilities";

// Program D — Wave 1 (Marketplace Coverage Expansion). Same Delta Import
// wiring as Shopping China/Mega Eletrônicos. `SitemapCrawler` already
// recurses through `sitemap_index.xml` into every `product-sitemap{N}.xml`
// on its own (`sdk/sitemap/SitemapCrawler.ts` — sitemap-index detection was
// already generic, built in Wave 5) — no new discovery code was needed here.
// Program Σ — Mission Σ-2 — Delta Import generalized to the platform-level
// Delta Engine (`../../delta`); behavior unchanged.
// Mission Ω-Pipeline — fetchStream() is the real implementation now
// (streamSitemapConnector, shared with the other 3 sitemap connectors);
// fetch() is a thin backward-compatible wrapper that drains it into an
// array, unchanged in observable behavior for any existing caller.
export class RomaShoppingConnector implements IConnector {
  readonly metadata: ConnectorMetadata = {
    id: CFG.connectorId,
    name: "Roma Shopping",
    version: CFG.connectorVersion,
    type: ConnectorType.Crawler,
    storeSlug: CFG.storeSlug,
    description: "Conector oficial para romapy.com — maior catálogo entre os merchants de Ciudad del Este",
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
      logPrefix: "RomaShopping",
      fetchAndParse: async (url: string): Promise<{ offer: RawOffer | null }> => {
        const detailResult = await this.fetcher.fetch(url, { timeoutMs: CFG.timeoutMs });
        if (!detailResult.ok) {
          console.warn(`[RomaShopping] Failed to fetch product ${url}: ${detailResult.error}`);
          return { offer: null };
        }

        const { offer, error } = parseDetailPage(detailResult.html, url, CFG.storeSlug);
        if (!offer) {
          console.warn(`[RomaShopping] Parse error for ${url}: ${error}`);
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
