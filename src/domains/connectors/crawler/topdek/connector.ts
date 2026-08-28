import type { IConnector, ConnectorMetadata, ConnectorFetchOptions } from "../../types/connector.types";
import type { RawOffer, RawOfferStream, ConnectorBatch } from "../../types/raw.types";
import { ConnectorType } from "../../types/enums";
import { HttpFetchStrategy, RateLimitedFetchStrategy, SitemapCrawler } from "../../sdk";
import { DeltaEngine } from "../../delta";
import { SupabaseDeltaStateRepository } from "../../infrastructure/SupabaseDeltaStateRepository";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { streamSitemapConnector } from "../../streaming/SitemapConnectorStream";
import { isProductUrl, parseProductUrl } from "./listing-parser";
import { parseDetailPage } from "./detail-parser";
import { TOPDEK_CONFIG as CFG } from "./config";
import { CAPABILITIES } from "./capabilities";

// TopDek — Shopify store (topdek.com, decking/foam sheets + a modest product
// catalog). Sprint "Connector Expansion V1": first real ingestion beyond the
// incumbent 5 connectors. Uses the SAME streaming sitemap pipeline
// (streamSitemapConnector + Delta Import engine + checkpoint flushing) as the
// other 4 sitemap connectors — REUSE, not a parallel architecture.
// Continuous Price Collection: syncFrequencyHours=24 in config → swept daily
// by /api/cron/connectors/sync → price_history builds a real multi-day series.
export class TopDekConnector implements IConnector {
  readonly metadata: ConnectorMetadata = {
    id: CFG.connectorId,
    name: "TopDek",
    version: CFG.connectorVersion,
    type: ConnectorType.Crawler,
    storeSlug: CFG.storeSlug,
    description: "Conector oficial para topdek.com — Shopify (decking/foam sheets e catálogo geral)",
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
      logPrefix: "TopDek",
      fetchAndParse: async (url: string): Promise<{ offer: RawOffer | null }> => {
        const parsed = parseProductUrl(url);
        if (!parsed) return { offer: null };

        const detailResult = await this.fetcher.fetch(parsed.url, { timeoutMs: CFG.timeoutMs });
        if (!detailResult.ok) {
          console.warn(`[TopDek] Failed to fetch product ${parsed.url}: ${detailResult.error}`);
          return { offer: null };
        }

        const { offer } = parseDetailPage(parsed.url, parsed.externalId, detailResult.html);
        if (!offer) return { offer: null };
        return { offer };
      },
    });
  }

  /** Thin backward-compatible wrapper — drains fetchStream into a batch
   * (same as the other sitemap connectors). */
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
