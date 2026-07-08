import type { IConnector, ConnectorMetadata } from "../../types/connector.types";
import type { ConnectorBatch } from "../../types/raw.types";
import { ConnectorType } from "../../types/enums";
import { HttpFetchStrategy, RateLimitedFetchStrategy } from "../../sdk";
import { MOBILE_ZONE_CONFIG as CFG } from "./config";
import { CAPABILITIES } from "./capabilities";
import { mapApiProduct } from "./product-mapper";

// Wave Ξ-1 (PROGRAM Ξ). Discovered via legitimate means only — see config.ts
// header comment. No sitemap crawling, no HTML parsing: this connector
// paginates the site's own public REST API directly (`GET /products?offset=
// &limit=`), the same endpoint the React SPA itself calls. Reuses the SDK's
// HttpFetchStrategy/RateLimitedFetchStrategy (retry/backoff + politeness
// delay) exactly like every other connector — no new fetch infrastructure.
interface ApiProductsResponse {
  count: number;
  products: unknown[];
}

export class MobileZoneConnector implements IConnector {
  readonly metadata: ConnectorMetadata = {
    id: CFG.connectorId,
    name: "Mobile Zone",
    version: CFG.connectorVersion,
    type: ConnectorType.ApiRest,
    storeSlug: CFG.storeSlug,
    description: "Conector oficial para mobilezone.com.py — celulares e eletrônicos, via API pública do site",
    capabilities: CAPABILITIES,
  };

  private readonly fetcher = new RateLimitedFetchStrategy(new HttpFetchStrategy(), CFG.requestDelayMs);

  async fetch(): Promise<ConnectorBatch> {
    const fetchedAt = new Date().toISOString();
    const allOffers: ConnectorBatch["items"] = [];

    let offset = 0;
    let total = Infinity;

    while (allOffers.length < CFG.maxProducts && offset < total) {
      const url = `${CFG.apiBaseUrl}/products?offset=${offset}&limit=${CFG.pageSize}`;
      const result = await this.fetcher.fetch(url, { timeoutMs: CFG.timeoutMs });

      if (!result.ok) {
        console.warn(`[MobileZone] Failed to fetch page at offset ${offset}: ${result.error}`);
        break;
      }

      let page: ApiProductsResponse;
      try {
        page = JSON.parse(result.html);
      } catch (err) {
        console.warn(`[MobileZone] Invalid JSON at offset ${offset}: ${String(err)}`);
        break;
      }

      total = page.count;
      if (!page.products || page.products.length === 0) break;

      for (const raw of page.products) {
        const { offer, error } = mapApiProduct(raw as Parameters<typeof mapApiProduct>[0]);
        if (offer) {
          allOffers.push(offer);
          if (allOffers.length >= CFG.maxProducts) break;
        } else {
          console.warn(`[MobileZone] Skipped product: ${error}`);
        }
      }

      offset += CFG.pageSize;
    }

    return {
      connectorId: CFG.connectorId,
      connectorVersion: CFG.connectorVersion,
      fetchedAt,
      items: allOffers,
    };
  }
}
