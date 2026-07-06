import type { SupabaseClient } from "@supabase/supabase-js";
import { connectorRegistry } from "@/src/domains/connectors/services/ConnectorRegistry";
import type { ConnectorDirectoryEntry, ConnectorDirectoryDetail } from "@/src/domains/connectors/directory/types";
import { createConnectorsServices } from "./connectors-factory";
import { ConnectorCertificationService } from "./connector-certification-service";

// Connector Registry V2 (Release 1.8 — Program B — Wave 2). Answers "id +
// merchant + version + capabilities + status + certification + health +
// quality score for every connector" — the query surface the CTO asked
// Registry V2 to expose. Lives in lib/, not inside
// src/domains/connectors/services/ConnectorRegistry.ts, for the same
// circular-dependency reason as Certification/Observability: resolving
// "merchant" crosses into `merchant_stores`, and quality score crosses into
// 4 other domains — `marketplace-operations` already depends on
// `connectors`, so `connectors` cannot depend back.
//
// `ConnectorRegistryImpl` itself is unchanged in shape: it stays a pure
// in-memory index (register/get/list/has/unregister/listMetadata/
// findByCapability). This service composes it with persisted data, it does
// not replace it.
export class ConnectorDirectoryService {
  constructor(private readonly client: SupabaseClient) {}

  /** Cheap overview — one health-service call, one merchant-lookup query,
   * no certification/quality-score (see directory/types.ts doc comment). */
  async listAll(): Promise<ConnectorDirectoryEntry[]> {
    const { connectorRepo, healthService } = createConnectorsServices(this.client);
    const metadata = connectorRegistry.listMetadata();
    if (metadata.length === 0) return [];

    const [healthSummaries, merchantByStoreSlug] = await Promise.all([
      healthService.getSummaries(),
      this.resolveMerchantsByStoreSlug(metadata.map((m) => m.storeSlug)),
    ]);

    return Promise.all(
      metadata.map(async (m) => {
        const persisted = await connectorRepo.findByKey(m.id);
        const health = healthSummaries.find((h) => h.connectorKey === m.id);

        return {
          connectorId: m.id,
          name: m.name,
          version: m.version,
          storeSlug: m.storeSlug,
          merchantId: merchantByStoreSlug.get(m.storeSlug) ?? null,
          capabilities: m.capabilities,
          status: persisted?.status ?? null,
          healthScore: health?.healthScore ?? 0,
          lastSyncAt: health?.lastSyncAt ?? null,
        };
      })
    );
  }

  /** Expensive single-connector deep-dive — adds Certification + Quality
   * Score on top of everything `listAll()` already resolves. */
  async getDetail(connectorId: string): Promise<ConnectorDirectoryDetail | null> {
    const entries = await this.listAll();
    const entry = entries.find((e) => e.connectorId === connectorId);
    if (!entry) return null;

    const certificationService = new ConnectorCertificationService(this.client);
    const [certification, qualityScore] = await Promise.all([
      certificationService.certify(connectorId, entry.storeSlug),
      certificationService.computeQualityScore(connectorId, entry.storeSlug),
    ]);

    return { ...entry, certification, qualityScore };
  }

  private async resolveMerchantsByStoreSlug(storeSlugs: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (storeSlugs.length === 0) return map;

    const { data: stores } = await this.client.from("stores").select("id, slug").in("slug", storeSlugs);
    const storeIdBySlug = new Map(((stores ?? []) as { id: string; slug: string }[]).map((s) => [s.id, s.slug]));
    if (storeIdBySlug.size === 0) return map;

    const { data: links } = await this.client
      .from("merchant_stores")
      .select("merchant_id, store_id")
      .in("store_id", [...storeIdBySlug.keys()]);

    for (const link of (links ?? []) as { merchant_id: string; store_id: string }[]) {
      const slug = storeIdBySlug.get(link.store_id);
      if (slug) map.set(slug, link.merchant_id);
    }
    return map;
  }
}
