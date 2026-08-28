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
import { MerchantJsonFeedParser } from "../parser/MerchantJsonFeedParser";
import { MerchantJsonPaginator } from "../parser/MerchantJsonPaginator";
import { DEFAULT_FIELD_MAPPING } from "../config/MerchantSourceConfig";
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
      description: `Feed oficial de ${storeSlug} (${cfg.sourceType ?? "XML_FEED"})`,
      capabilities: CAPABILITIES,
    };
  }

  /** Batch de uma vez (retrocompat). */
  async fetch(): Promise<{ connectorId: string; connectorVersion: string; fetchedAt: string; items: RawOffer[] }> {
    const { body } = await this.fetchBody();
    const parsed = this.parseBody(body);
    const offers = parsed.offers.map((o) => ({ ...o, storeSlug: this.storeSlug }));
    return { connectorId: this.metadata.id, connectorVersion: this.metadata.version, fetchedAt: new Date().toISOString(), items: offers };
  }

  /**
   * Fluxo em lotes bounded (Mission Ω-Pipeline) — o feed pode ser grande
   * (10k/50k itens), memória limitada pelo lote do SyncOrchestrator.
   */
  async *fetchStream(): RawOfferStream {
    const isJson = this.cfg.sourceType === "JSON_FEED" || this.cfg.sourceConfig?.sourceType === "JSON_FEED";
    const pagination = this.cfg.sourceConfig?.pagination;

    // JSON paginado: processa página a página (bounded, sem materializar tudo).
    if (isJson && pagination?.nextPageField) {
      const paginator = new MerchantJsonPaginator({ fetchPage: async (url) => this.fetchPageBody(url) });
      const { bodies, lastError } = await paginator.collect(this.cfg.feedUrl, pagination);
      if (lastError) {
        console.warn(`[merchant-feed:${this.storeSlug}] pagination stopped: ${lastError}`);
      }
      for (const body of bodies) {
        const parsed = this.parseBody(body);
        for (const offer of parsed.offers) {
          yield { ...offer, storeSlug: this.storeSlug };
        }
        for (const err of parsed.errors) {
          console.warn(`[merchant-feed:${this.storeSlug}] item rejected: ${err.reason}${err.codigo ? ` (#${err.codigo})` : ""}`);
        }
      }
      return;
    }

    const { body } = await this.fetchBody();
    const parsed = this.parseBody(body);
    for (const offer of parsed.offers) {
      yield { ...offer, storeSlug: this.storeSlug };
    }
    // itens inválidos isolados (malformado NÃO derruba o feed inteiro)
    for (const err of parsed.errors) {
      console.warn(`[merchant-feed:${this.storeSlug}] item rejected: ${err.reason}${err.codigo ? ` (#${err.codigo})` : ""}`);
    }
  }

  private parseBody(body: string): { offers: RawOffer[]; errors: Array<{ codigo?: string; reason: string }> } {
    if (this.cfg.sourceType === "JSON_FEED" || this.cfg.sourceConfig?.sourceType === "JSON_FEED") {
      const cfg = this.cfg.sourceConfig ?? {
        sourceType: "JSON_FEED" as const,
        feedUrl: this.cfg.feedUrl,
        fieldMapping: DEFAULT_FIELD_MAPPING,
      };
      const parsed = new MerchantJsonFeedParser(cfg).parse(body);
      return { offers: parsed.offers, errors: parsed.errors };
    }
    const parsed = new MerchantFeedParser().parse(body);
    return { offers: parsed.offers, errors: parsed.errors };
  }

  private async fetchPageBody(url: string): Promise<{ body: string; ok: boolean; error?: string }> {
    if (this.cfg.sourceConfig?.sourceType !== "JSON_FEED") {
      // fallback ao fetchBody configurado (teste) quando não há network.
      try {
        const { body } = await this.fetchBody(url);
        return { body, ok: true };
      } catch (e) {
        return { body: "", ok: false, error: (e as Error).message };
      }
    }
    const fetcher = new SecureFeedFetcher();
    const res = await fetcher.fetch({ url });
    if (!res.ok || res.notModified) {
      return { body: "", ok: false, error: res.error ?? `HTTP_${res.status}` };
    }
    return { body: res.body, ok: true };
  }

  private async fetchBody(url: string = this.cfg.feedUrl): Promise<{ body: string }> {
    if (this.deps.fetchBody) {
      return this.deps.fetchBody(url, this.cfg.etag, this.cfg.lastModified);
    }
    const fetcher = new SecureFeedFetcher();
    const res = await fetcher.fetch({ url, etag: this.cfg.etag, lastModified: this.cfg.lastModified });
    if (!res.ok || res.notModified) {
      throw new Error(`FEED_FETCH_FAILED:${res.error ?? `HTTP_${res.status}`}`);
    }
    return { body: res.body };
  }
}
