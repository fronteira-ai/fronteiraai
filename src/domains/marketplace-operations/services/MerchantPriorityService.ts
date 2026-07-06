import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreMerchantPriority } from "../scoring/PriorityScoring";
import type { MerchantPriorityScore } from "../types/priority.types";
import { getBuyerVolumeMetrics } from "../metrics/BuyerMetrics";

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  is_verified: boolean;
}

interface OfferRow {
  id: string;
  store_id: string;
  canonical_product_id: string | null;
}

// Epic 3 — Merchant Priority Engine. Compute-on-read (no snapshot table) —
// at the target scale of 100-1000 stores, recomputing on every dashboard
// load is cheap, and a second persisted source of truth would risk drifting
// from what's shown live (same reasoning already applied to merchant-decision
// recommendations). See docs/engineering/MARKETPLACE_FOUNDATION_SCALE_AUDIT.md
// for the point at which this tradeoff should be revisited.
export class MerchantPriorityService {
  constructor(private readonly client: SupabaseClient) {}

  async listAll(): Promise<MerchantPriorityScore[]> {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [storesRes, claimedRes, connectorsRes, successRunsRes, offersRes, priceHistoryRes, buyerVolume] =
      await Promise.all([
        this.client.from("stores").select("id, name, slug, is_verified"),
        this.client.from("store_claims").select("store_id").eq("status", "approved"),
        this.client.from("connectors").select("id, store_slug"),
        this.client.from("connector_sync_runs").select("connector_id, started_at").eq("status", "success"),
        this.client.from("offers").select("id, store_id, canonical_product_id"),
        this.client.from("price_history").select("offer_id").gte("recorded_at", since30d),
        getBuyerVolumeMetrics(this.client),
      ]);

    const stores = (storesRes.data ?? []) as StoreRow[];
    const claimedStoreIds = new Set((claimedRes.data ?? []).map((r: { store_id: string }) => r.store_id));
    const connectorIdBySlug = new Map(
      (connectorsRes.data ?? []).map((c: { id: string; store_slug: string }) => [c.store_slug, c.id])
    );

    const lastSyncByConnectorId = new Map<string, string>();
    const syncCountByConnectorId = new Map<string, number>();
    for (const run of (successRunsRes.data ?? []) as { connector_id: string; started_at: string }[]) {
      syncCountByConnectorId.set(run.connector_id, (syncCountByConnectorId.get(run.connector_id) ?? 0) + 1);
      const prev = lastSyncByConnectorId.get(run.connector_id);
      if (!prev || run.started_at > prev) lastSyncByConnectorId.set(run.connector_id, run.started_at);
    }

    const offersByStore = new Map<string, OfferRow[]>();
    for (const offer of (offersRes.data ?? []) as OfferRow[]) {
      const list = offersByStore.get(offer.store_id) ?? [];
      list.push(offer);
      offersByStore.set(offer.store_id, list);
    }

    const priceChangesByOffer = new Map<string, number>();
    for (const row of (priceHistoryRes.data ?? []) as { offer_id: string }[]) {
      priceChangesByOffer.set(row.offer_id, (priceChangesByOffer.get(row.offer_id) ?? 0) + 1);
    }

    const offerCountByStore = stores.map((s) => offersByStore.get(s.id)?.length ?? 0);
    const maxOfferCount = Math.max(1, ...offerCountByStore);
    const maxPopularity = Math.max(1, ...Array.from(buyerVolume.eventsByStore.values()));

    const scores = stores.map((store) => {
      const connectorId = connectorIdBySlug.get(store.slug);
      const lastSync = connectorId ? lastSyncByConnectorId.get(connectorId) : undefined;
      const syncCount30d = connectorId ? (syncCountByConnectorId.get(connectorId) ?? 0) : 0;

      const storeOffers = offersByStore.get(store.id) ?? [];
      const priceChanges = storeOffers.reduce((sum, o) => sum + (priceChangesByOffer.get(o.id) ?? 0), 0);
      const linkedOffers = storeOffers.filter((o) => o.canonical_product_id !== null).length;

      const businessValue = (store.is_verified ? 0.5 : 0) + (claimedStoreIds.has(store.id) ? 0.5 : 0);
      const popularity = (buyerVolume.eventsByStore.get(store.id) ?? 0) / maxPopularity;
      const freshness = lastSync ? freshnessRatio(lastSync) : 0;
      const catalogSize = storeOffers.length / maxOfferCount;
      // "Coverage" here is this store's own canonical-linkage completeness
      // (how much of its catalog is integrated with Canonical Catalog),
      // distinct from catalogSize (raw assortment size).
      const coverage = storeOffers.length > 0 ? linkedOffers / storeOffers.length : 0;
      const syncFrequency = Math.min(1, syncCount30d / 30); // ~daily syncs over 30d = full score
      const priceVolatility = Math.min(1, priceChanges / 20); // 20+ price changes/30d = full score

      return scoreMerchantPriority(store.id, store.name, store.slug, {
        businessValue,
        popularity,
        freshness,
        coverage,
        catalogSize,
        syncFrequency,
        priceVolatility,
      });
    });

    return scores.sort((a, b) => b.score - a.score);
  }
}

function freshnessRatio(lastSyncIso: string): number {
  const ageHours = (Date.now() - new Date(lastSyncIso).getTime()) / (1000 * 60 * 60);
  if (ageHours <= 24) return 1;
  if (ageHours <= 24 * 7) return 0.6;
  if (ageHours <= 24 * 30) return 0.2;
  return 0;
}
