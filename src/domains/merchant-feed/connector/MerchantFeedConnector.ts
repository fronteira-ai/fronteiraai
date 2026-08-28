/**
 * Merchant Feed Platform — connector IConnector.
 *
 * Transforma um feed de lojista (XML/JSON/CSV no V1 = XML) em um fluxo de
 * RawOffer igual a qualquer outro conector (GraphQL/crawler/...). O marketplace
 * downstream NÃO distingue a origem — reuso total da pipeline.
 *
 * O connector é registrado no registry por `merchant-feed-<storeSlug>` e o
 * Adaptive Sync Engine o agenda via isDue/next_sync_at (sem cron paralelo).
 */

import type { IConnector, ConnectorMetadata } from "../../connectors/types/connector.types";
import type { ConnectorCapabilities } from "../../connectors/types/capability.types";
import type { RawOffer, RawOfferStream } from "../../connectors/types/raw.types";
import { ConnectorType } from "../../connectors/types/enums";
import { MerchantFeedParser } from "../parser/MerchantFeedParser";
import { SecureFeedFetcher } from "../fetcher/SecureFeedFetcher";
import type { MerchantFeedConfig } from "../config/MerchantFeedConfig";

export interface MerchantFeedConnectorDeps {
  fetchBody?: (url: string, etag?: string | null, lastModified?: string | null) => Promise<{ body: string; etag?: string | null; lastModified?: string | null; notModified?: boolean }>;
}

const CAPABILITIES: ConnectorCapabilities = {
  supportsRealtime: true,                 // feed oficial com cadência HOT/WARM
  supportsSearch: false,
  supportsPagination: false,              // feed é lista completa (sem paginação de origem)
  supportsImages: true,
  supportsBrands: true,
  supportsCategories: true,               // quando presente no feed
  supportsStock: true,                    // estoque/disponibilidade reais do feed
  supportsExchange: true,                 // moeda preservada do feed (USD/PYG...)
  supportsStructuredData: true,           // XML estruturado
  supportsCanonicalMatching: true,        // brand+modelo p/ casamento canônico
};

export class MerchantFeedConnector implements IConnector {
  readonly metadata: ConnectorMetadata;

  constructor(
    private readonly cfg: MerchantFeedConfig,
    private readonly storeSlug: string,
    private readonly deps: MerchantFeedConnectorDeps = {},
  ) {
    this.metadata = {
      id: `merchant-feed-${storeSlug}`,
      name: `${storeSlug} (feed oficial)`,
      version: "1.0.0",
      type: ConnectorType.XmlFile,
      storeSlug,
      description: `Feed oficial de ${storeSlug} (XML_FEED)`,
      capabilities: CAPABILITIES,
    };
  }

  /** Batch de uma vez (retrocompat). */
  async fetch(): Promise<{ connectorId: string; connectorVersion: string; fetchedAt: string; items: RawOffer[] }> {
    const { body } = await this.fetchBody();
    const parsed = new MerchantFeedParser().parse(body);
    const offers = parsed.offers.map((o) => ({ ...o, storeSlug: this.storeSlug }));
    return { connectorId: this.metadata.id, connectorVersion: this.metadata.version, fetchedAt: new Date().toISOString(), items: offers };
  }

  /**
   * Fluxo em lotes bounded (Mission Ω-Pipeline) — o feed pode ser grande
   * (10k/50k itens), memória limitada pelo lote do SyncOrchestrator.
   */
  async *fetchStream(): RawOfferStream {
    const { body } = await this.fetchBody();
    const parsed = new MerchantFeedParser().parse(body);
    for (const offer of parsed.offers) {
      yield { ...offer, storeSlug: this.storeSlug };
    }
    // itens inválidos isolados (malformado NÃO derruba o feed inteiro)
    for (const err of parsed.errors) {
      console.warn(`[merchant-feed:${this.storeSlug}] item rejected: ${err.reason}${err.codigo ? ` (#${err.codigo})` : ""}`);
    }
  }

  private async fetchBody(): Promise<{ body: string }> {
    if (this.deps.fetchBody) {
      return this.deps.fetchBody(this.cfg.feedUrl, this.cfg.etag, this.cfg.lastModified);
    }
    const fetcher = new SecureFeedFetcher();
    const res = await fetcher.fetch({ url: this.cfg.feedUrl, etag: this.cfg.etag, lastModified: this.cfg.lastModified });
    if (!res.ok || res.notModified) {
      throw new Error(`FEED_FETCH_FAILED:${res.error ?? `HTTP_${res.status}`}`);
    }
    return { body: res.body };
  }
}
