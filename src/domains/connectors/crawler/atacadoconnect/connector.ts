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
import { ATACADO_CONNECT_CONFIG as CFG } from "./config";
import { CAPABILITIES } from "./capabilities";

// Program D — Wave 1 (Marketplace Coverage Expansion). Same Delta Import
// wiring as the other 3 connectors — no new Connector Platform component.
// Program Σ — Mission Σ-2 — Delta Import generalized to the platform-level
// Delta Engine (`../../delta`); behavior unchanged.
// Mission Ω-Pipeline — fetchStream() is the real implementation now
// (streamSitemapConnector, shared with the other 3 sitemap connectors);
// fetch() is a thin backward-compatible wrapper that drains it into an
// array, unchanged in observable behavior for any existing caller.
export class AtacadoConnectConnector implements IConnector {
  readonly metadata: ConnectorMetadata = {
    id: CFG.connectorId,
    name: "Atacado Connect",
    version: CFG.connectorVersion,
    type: ConnectorType.Crawler,
    storeSlug: CFG.storeSlug,
    description: "Conector oficial para atacadoconnect.com — catálogo grande, stack Next.js/Vercel",
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
      logPrefix: "AtacadoConnect",
      fetchAndParse: async (url: string): Promise<{ offer: RawOffer | null }> => {
        const parsed = parseProductUrl(url);
        if (!parsed) return { offer: null };

        const detailResult = await this.fetcher.fetch(parsed.url, { timeoutMs: CFG.timeoutMs });
        if (!detailResult.ok) {
          console.warn(`[AtacadoConnect] Failed to fetch product ${parsed.url}: ${detailResult.error}`);
          return { offer: null };
        }

        const { offer, error } = parseDetailPage(detailResult.html, parsed.url, CFG.storeSlug, parsed.externalId);
        if (!offer) {
          console.warn(`[AtacadoConnect] Parse error for ${parsed.url}: ${error}`);
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
