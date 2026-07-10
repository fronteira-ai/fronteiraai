import type { IConnector, ConnectorMetadata, ConnectorFetchOptions } from "../../types/connector.types";
import type { ConnectorBatch } from "../../types/raw.types";
import { ConnectorType } from "../../types/enums";
import { HttpFetchStrategy, RateLimitedFetchStrategy, SitemapCrawler } from "../../sdk";
import { DeltaEngine } from "../../delta";
import { SupabaseDeltaStateRepository } from "../../infrastructure/SupabaseDeltaStateRepository";
import type { DeltaStateEntry } from "../../repositories/IDeltaStateRepository";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
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

  async fetch(options: ConnectorFetchOptions = {}): Promise<ConnectorBatch> {
    const fetchedAt = new Date().toISOString();
    const allOffers: ConnectorBatch["items"] = [];

    const deltaStateRepo = new SupabaseDeltaStateRepository(getSupabaseServiceClient());
    const previousCheckpoints = await deltaStateRepo.getCheckpoints(CFG.connectorId);

    const entries = await this.sitemapCrawler.collectEntries(CFG.sitemapUrl, {
      timeoutMs: CFG.timeoutMs,
      filter: isProductUrl,
    });

    const candidates = entries.map((e) => ({ key: e.url, checkpoint: e.lastmod }));
    const plan = this.deltaEngine.plan(candidates, previousCheckpoints);
    console.log(
      `[RomaShopping] Sitemap yielded ${entries.length} product URLs — Delta Import: ${plan.toFetch.length} to fetch, ${plan.skipped.length} skipped (unchanged since last sync)`
    );

    const checkpointByUrl = new Map(entries.map((e) => [e.url, e.lastmod]));
    const toFetch = plan.toFetch.slice(0, CFG.maxProducts);
    const fetchedSnapshots: DeltaStateEntry[] = [];

    for (const url of toFetch) {
      const detailResult = await this.fetcher.fetch(url, { timeoutMs: CFG.timeoutMs });
      if (!detailResult.ok) {
        console.warn(`[RomaShopping] Failed to fetch product ${url}: ${detailResult.error}`);
        continue;
      }

      const { offer, error } = parseDetailPage(detailResult.html, url, CFG.storeSlug);

      if (offer) {
        allOffers.push(offer);
        const checkpoint = checkpointByUrl.get(url);
        if (checkpoint) fetchedSnapshots.push({ key: url, checkpoint });
      } else {
        console.warn(`[RomaShopping] Parse error for ${url}: ${error}`);
      }
    }

    const skippedSnapshots: DeltaStateEntry[] = plan.skipped
      .map((url) => ({ key: url, checkpoint: checkpointByUrl.get(url) }))
      .filter((e): e is DeltaStateEntry => !!e.checkpoint);

    if (!options.dryRun) {
      await deltaStateRepo.saveCheckpoints(CFG.connectorId, [...fetchedSnapshots, ...skippedSnapshots]);
    }

    return {
      connectorId: CFG.connectorId,
      connectorVersion: CFG.connectorVersion,
      fetchedAt,
      items: allOffers,
    };
  }
}
