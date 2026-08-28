import type { IConnector, ConnectorMetadata, ConnectorFetchOptions } from "../../types/connector.types";
import type { ConnectorBatch, RawOffer, RawOfferStream } from "../../types/raw.types";
import { ConnectorType } from "../../types/enums";
import { fetchFamiliesByCategory, familyToOffer } from "./family-mapper";
import { enrichOffer } from "./detail-mapper";
import { fetchAllCategories, isStrategicCategory } from "./category-mapper";
import { NEW_ZONE_CONFIG as CFG } from "./config";

// New Zone — varejista real de eletrônicos/Apple (Ciudad del Este), catálogo
// acessível via API GraphQL PÚBLICA (/api/graphql; sem auth/CAPTCHA/WAF bypass
// — request público legítimo). Sprint Strategic Commerce Expansion V2.
//
// Usa fetchStream para o SyncOrchestrator persistir em lotes limitados. Cada
// oferta é enriquecida via product_get_one (brand/category/stock REAIS) —
// exigência do Gatekeeper (Catalog Integrity Firewall) para persistir: sem
// brand/category confirmados a oferta vai a catalog_pending_review (correto).
// Enriquecimento é rate-limited (politeness) e best-effort.
export class NewZoneConnector implements IConnector {
  readonly metadata: ConnectorMetadata = {
    id: CFG.connectorId,
    name: "New Zone",
    version: CFG.connectorVersion,
    type: ConnectorType.ApiRest,
    storeSlug: CFG.storeSlug,
    description: "Conector oficial newzone.com.py — API GraphQL pública (eletrônicos/Apple/smartphones)",
    capabilities: {
      supportsRealtime: true,
      supportsSearch: true,
      supportsPagination: true,
      supportsImages: true,
      supportsBrands: true,
      supportsCategories: true,
      supportsStock: true,
      supportsExchange: true,
      supportsStructuredData: false,
      supportsCanonicalMatching: true,
    },
  };

  async *fetchStream(options: ConnectorFetchOptions = {}): RawOfferStream {
    // Auto-descoberta de categorias estratégicas (estrutura real da API),
    // com fallback ao seed mínimo se a query de categorias falhar.
    let categoryIds: number[] = [...CFG.STRATEGIC_CATEGORY_IDS];
    try {
      const cats = await fetchAllCategories();
      const strategic = cats.filter((c) => isStrategicCategory(c.name)).map((c) => c.id_category);
      if (strategic.length > 0) categoryIds = [...strategic];
      if (options.dryRun) console.log(`[NewZone] auto-discovered ${strategic.length} strategic categories`);
    } catch (e) {
      console.warn(`[NewZone] category auto-discovery failed (fallback): ${(e as Error).message.slice(0, 60)}`);
    }

    // ── Catalog Convergence (Part B): retoma do ponto exato do sweep anterior.
    const resumeFrom = Math.max(0, options.checkpoint?.categoriesDone ?? 0);
    const total = categoryIds.length;
    let produced = 0;
    let discovered = 0;
    let unitsCompleted = 0;

    let first = true;
    for (let ci = resumeFrom; ci < total; ci++) {
      const catId = categoryIds[ci];
      if (!first) await delay(CFG.requestDelayMs); // politeness entre categorias
      first = false;
      const families = await fetchFamiliesByCategory(catId);
      discovered += families.length;
      if (options.dryRun) {
        console.log(`[NewZone] category ${catId}: ${families.length} families (cat ${ci + 1}/${total})`);
      }
      for (const fam of families) {
        const offer = familyToOffer(fam);
        if (!options.dryRun) {
          await enrichOffer(offer); // brand/category/stock reais (Gatekeeper)
          await delay(CFG.requestDelayMs);
        }
        yield offer;
        produced++;
      }
      unitsCompleted++;
      // Progresso por categoria — o orquestrador persiste o cursor por wake.
      options.reportProgress?.({
        unitsCompleted,
        discovered,
        processed: produced,
        valid: produced,
        invalid: 0,
        errors: 0,
      });
    }
  }

  /** Thin wrapper — SyncOrchestrator.run()/manual tools ainda usam fetch(). */
  async fetch(options: ConnectorFetchOptions = {}): Promise<ConnectorBatch> {
    const fetchedAt = new Date().toISOString();
    const allOffers: RawOffer[] = [];
    for await (const offer of this.fetchStream(options)) allOffers.push(offer);
    return { connectorId: CFG.connectorId, connectorVersion: CFG.connectorVersion, fetchedAt, items: allOffers };
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
