import type { IConnector, ConnectorMetadata, ConnectorFetchOptions } from "../../types/connector.types";
import type { ConnectorBatch } from "../../types/raw.types";
import { ConnectorType } from "../../types/enums";
import { HttpFetchStrategy, RateLimitedFetchStrategy, SitemapCrawler, DeltaImportPlanner } from "../../sdk";
import { SupabaseConnectorUrlSnapshotRepository } from "../../infrastructure/SupabaseConnectorUrlSnapshotRepository";
import type { UrlSnapshotEntry } from "../../repositories/IConnectorUrlSnapshotRepository";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { isProductUrl, parseProductUrl } from "./listing-parser";
import { parseDetailPage } from "./detail-parser";
import { MEGA_ELETRONICOS_CONFIG as CFG } from "./config";
import { CAPABILITIES } from "./capabilities";

// Program D — Wave 1 (Marketplace Coverage Expansion). Same shape as
// ShoppingChinaConnector (sitemap-driven discovery + Delta Import, wired
// from day one — not retrofitted later) — no new Connector Platform
// component was introduced for this merchant, per the Wave's mandate.
export class MegaEletronicosConnector implements IConnector {
  readonly metadata: ConnectorMetadata = {
    id: CFG.connectorId,
    name: "Mega Eletrônicos",
    version: CFG.connectorVersion,
    type: ConnectorType.Crawler,
    storeSlug: CFG.storeSlug,
    description: "Conector oficial para megaeletronicos.com — maior loja de eletrônicos de Ciudad del Este",
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
      `[MegaEletronicos] Sitemap yielded ${entries.length} product URLs — Delta Import: ${plan.toFetch.length} to fetch, ${plan.skipped.length} skipped (unchanged since last sync)`
    );

    const lastmodByUrl = new Map(entries.map((e) => [e.url, e.lastmod]));
    const toFetch = plan.toFetch.slice(0, CFG.maxProducts);
    const fetchedSnapshots: UrlSnapshotEntry[] = [];

    for (const url of toFetch) {
      const parsed = parseProductUrl(url);
      if (!parsed) continue;

      const detailResult = await this.fetcher.fetch(parsed.url, { timeoutMs: CFG.timeoutMs });
      if (!detailResult.ok) {
        console.warn(`[MegaEletronicos] Failed to fetch product ${parsed.url}: ${detailResult.error}`);
        continue;
      }

      const { offer, error } = parseDetailPage(detailResult.html, parsed.url, CFG.storeSlug, parsed.externalId);

      if (offer) {
        allOffers.push(offer);
        const lastmod = lastmodByUrl.get(url);
        if (lastmod) fetchedSnapshots.push({ url, lastmod });
      } else {
        console.warn(`[MegaEletronicos] Parse error for ${parsed.url}: ${error}`);
      }
    }

    const skippedSnapshots: UrlSnapshotEntry[] = plan.skipped
      .map((url) => ({ url, lastmod: lastmodByUrl.get(url) }))
      .filter((e): e is UrlSnapshotEntry => !!e.lastmod);

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
