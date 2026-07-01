import type { IConnector, ConnectorMetadata } from "../../types/connector.types";
import type { ConnectorBatch } from "../../types/raw.types";
import { ConnectorType } from "../../types/enums";
import { HttpFetchStrategy } from "../fetch";
import { parseListingPage } from "./listing-parser";
import { parseDetailPage } from "./detail-parser";
import { SHOPPING_CHINA_CONFIG as CFG } from "./config";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class ShoppingChinaConnector implements IConnector {
  readonly metadata: ConnectorMetadata = {
    id: CFG.connectorId,
    name: "Shopping China",
    version: CFG.connectorVersion,
    type: ConnectorType.Crawler,
    storeSlug: CFG.storeSlug,
    description: "Conector oficial para shoppingchina.com.py — eletrônicos e informática",
  };

  private readonly fetcher = new HttpFetchStrategy();

  async fetch(): Promise<ConnectorBatch> {
    const allOffers: ConnectorBatch["items"] = [];
    const fetchedAt = new Date().toISOString();

    for (const category of CFG.categories) {
      const categoryUrl = `${CFG.baseUrl}/${category.slug}`;
      const listResult = await this.fetcher.fetch(categoryUrl, { timeoutMs: CFG.timeoutMs });

      if (!listResult.ok) {
        console.warn(`[ShoppingChina] Failed to fetch listing ${categoryUrl}: ${listResult.error}`);
        continue;
      }

      const products = parseListingPage(listResult.html, CFG.baseUrl);
      const limited = products.slice(0, CFG.maxProductsPerCategory);

      console.log(`[ShoppingChina] ${category.name}: ${limited.length} products found`);

      for (const product of limited) {
        await sleep(CFG.requestDelayMs);

        const detailResult = await this.fetcher.fetch(product.url, { timeoutMs: CFG.timeoutMs });

        if (!detailResult.ok) {
          console.warn(`[ShoppingChina] Failed to fetch product ${product.url}: ${detailResult.error}`);
          continue;
        }

        const { offer, error } = parseDetailPage(
          detailResult.html,
          product.url,
          CFG.storeSlug,
          category.name,
          product.externalId
        );

        if (offer) {
          allOffers.push(offer);
        } else {
          console.warn(`[ShoppingChina] Parse error for ${product.url}: ${error}`);
        }
      }

      // Delay between categories
      await sleep(CFG.requestDelayMs * 2);
    }

    return {
      connectorId: CFG.connectorId,
      connectorVersion: CFG.connectorVersion,
      fetchedAt,
      items: allOffers,
    };
  }
}
