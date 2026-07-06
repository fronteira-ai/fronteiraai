import type { SupabaseClient } from "@supabase/supabase-js";
import { ChangeType } from "../enums";
import type { IMarketChangeRepository } from "../repositories/IMarketChangeRepository";
import type { LiveActivityEntry, MarketChange } from "../types";

const DEFAULT_LOOKBACK_MINUTES = 60;
const DEFAULT_SAMPLE_LIMIT = 1000;
const MAX_ENTRIES = 20;

const LABELS: Partial<Record<ChangeType, string>> = {
  [ChangeType.PriceIncreased]: "aumentou preços",
  [ChangeType.PriceDecreased]: "reduziu preços",
  [ChangeType.StockReturned]: "produto voltou ao estoque",
  [ChangeType.StockOut]: "produto ficou fora de estoque",
  [ChangeType.OfferCreated]: "novos produtos",
  [ChangeType.OfferRemoved]: "produtos removidos",
  [ChangeType.PromotionDetected]: "nova promoção",
};

/** Epic 7 — Live Activity Feed. A pure read projection over market_changes,
 * grouped by (store, changeType) within the lookback window — no new table,
 * matching the examples in the Wave brief ("Shopping China alterou 124
 * preços, 2 minutos atrás"). */
export class LiveActivityFeedService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly changeRepo: IMarketChangeRepository
  ) {}

  async getRecent(lookbackMinutes: number = DEFAULT_LOOKBACK_MINUTES): Promise<LiveActivityEntry[]> {
    const to = new Date();
    const from = new Date(to.getTime() - lookbackMinutes * 60 * 1000);
    const changes = await this.changeRepo.listInRange(from, to, DEFAULT_SAMPLE_LIMIT);
    if (changes.length === 0) return [];

    const storeIds = [...new Set(changes.map((c) => c.storeId).filter((id): id is string => !!id))];
    const { data: stores } = await this.client.from("stores").select("id, name").in("id", storeIds);
    const nameById = new Map<string, string>(((stores ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]));

    const productIds = [...new Set(changes.map((c) => c.productId).filter((id): id is string => !!id))];
    const { data: products } = await this.client.from("products").select("id, name").in("id", productIds);
    const productNameById = new Map<string, string>(
      ((products ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name])
    );

    const groups = new Map<string, { storeId: string; changeType: ChangeType; changes: MarketChange[] }>();
    for (const change of changes) {
      if (!change.storeId) continue;
      const key = `${change.storeId}:${change.changeType}`;
      const group = groups.get(key) ?? { storeId: change.storeId, changeType: change.changeType, changes: [] };
      group.changes.push(change);
      groups.set(key, group);
    }

    const entries: LiveActivityEntry[] = [...groups.values()].map((g) => {
      const mostRecent = g.changes.reduce((latest, c) =>
        new Date(c.detectedAt).getTime() > new Date(latest.detectedAt).getTime() ? c : latest
      );
      const sampleProductId = mostRecent.productId;

      return {
        storeId: g.storeId,
        storeName: nameById.get(g.storeId) ?? g.storeId,
        changeType: g.changeType,
        summary: LABELS[g.changeType] ?? g.changeType,
        count: g.changes.length,
        occurredAt: mostRecent.detectedAt,
        sampleProductName: sampleProductId ? (productNameById.get(sampleProductId) ?? null) : null,
      };
    });

    return entries.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, MAX_ENTRIES);
  }
}
