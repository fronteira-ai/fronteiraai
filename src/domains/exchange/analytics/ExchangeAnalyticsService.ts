import type { SupabaseClient } from "@supabase/supabase-js";
import { CurrencyPair } from "../enums/CurrencyPair";
import type { ExchangeHistoryService } from "../history/ExchangeHistoryService";
import {
  computeRateVariation,
  detectSignificantMoves,
  computeStoreReactionLag,
  computeCategoryImpact,
  computeCatalogValueGrowth,
  computeBuyerSavings,
  type RateVariation,
  type SignificantMove,
  type StoreReactionLag,
  type CategoryImpact,
  type CatalogValueGrowth,
  type BuyerSavingsSummary,
  type PriceChangeEvent,
} from "./formulas";

export interface ExchangeAnalyticsSnapshot {
  rateVariation: RateVariation | null;
  significantMoves: SignificantMove[];
  storeReactionLag: StoreReactionLag[];
  categoryImpact: CategoryImpact[];
  catalogValueGrowth: CatalogValueGrowth | null;
  buyerSavings: BuyerSavingsSummary;
  windowDays: number;
  generatedAt: string;
}

interface PriceHistoryContext {
  offerId: string;
  storeId: string;
  categoryId: string | null;
  priceUsd: number;
  /** null if this is the first price change observed for this offer within the window
   * (even if an earlier price exists before `from` — documented simplification, avoids
   * an unbounded per-offer history fetch just to find one earlier data point). */
  previousPriceUsd: number | null;
  recordedAt: string;
}

const DEFAULT_WINDOW_DAYS = 30;

// Epic 6 — Exchange Analytics. Self-contained: reads price_history/offers/products
// directly with plain SupabaseClient calls rather than importing anything from
// canonical-catalog or connectors — Epic 1's "exchange never depends on other
// domains" rule applies to analytics too.
export class ExchangeAnalyticsService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly historyService: ExchangeHistoryService
  ) {}

  async computeSnapshot(windowDays = DEFAULT_WINDOW_DAYS): Promise<ExchangeAnalyticsSnapshot> {
    const to = new Date();
    const from = new Date(to.getTime() - windowDays * 24 * 60 * 60 * 1000);

    const [rateRange, priceHistoryContext] = await Promise.all([
      this.historyService.getRange(CurrencyPair.UsdPyg, from, to),
      this.fetchPriceHistoryWithContext(from, to),
    ]);

    const ratePoints = rateRange.map((r) => ({ rate: r.rate, capturedAt: r.capturedAt }));
    const rateVariation = computeRateVariation(ratePoints);
    const significantMoves = detectSignificantMoves(ratePoints);

    const storeReactionLag = computeStoreReactionLag(significantMoves, groupByStore(priceHistoryContext));
    const categoryImpact = computeCategoryImpact(significantMoves, buildPriceChangesByCategory(priceHistoryContext));

    const [catalogValueGrowth, buyerSavings] = await Promise.all([
      this.computeCatalogValueGrowth(priceHistoryContext),
      this.computeBuyerSavings(priceHistoryContext),
    ]);

    return {
      rateVariation,
      significantMoves,
      storeReactionLag,
      categoryImpact,
      catalogValueGrowth,
      buyerSavings,
      windowDays,
      generatedAt: new Date().toISOString(),
    };
  }

  private async fetchPriceHistoryWithContext(from: Date, to: Date): Promise<PriceHistoryContext[]> {
    const { data: historyRows } = await this.client
      .from("price_history")
      .select("offer_id, price_usd, recorded_at")
      .gte("recorded_at", from.toISOString())
      .lte("recorded_at", to.toISOString())
      .order("recorded_at", { ascending: true });

    const rows = (historyRows ?? []) as { offer_id: string; price_usd: number; recorded_at: string }[];
    if (rows.length === 0) return [];

    const offerIds = Array.from(new Set(rows.map((r) => r.offer_id)));
    const { data: offerRows } = await this.client.from("offers").select("id, store_id, product_id").in("id", offerIds);
    const offers = (offerRows ?? []) as { id: string; store_id: string; product_id: string }[];
    const offerById = new Map(offers.map((o) => [o.id, o]));

    const productIds = Array.from(new Set(offers.map((o) => o.product_id)));
    const { data: productRows } = await this.client.from("products").select("id, category_id").in("id", productIds);
    const categoryByProduct = new Map(
      ((productRows ?? []) as { id: string; category_id: string | null }[]).map((p) => [p.id, p.category_id])
    );

    const lastPriceByOffer = new Map<string, number>();
    const withContext: PriceHistoryContext[] = [];

    for (const row of rows) {
      const offer = offerById.get(row.offer_id);
      withContext.push({
        offerId: row.offer_id,
        storeId: offer?.store_id ?? "unknown",
        categoryId: offer ? (categoryByProduct.get(offer.product_id) ?? null) : null,
        priceUsd: row.price_usd,
        previousPriceUsd: lastPriceByOffer.get(row.offer_id) ?? null,
        recordedAt: row.recorded_at,
      });
      lastPriceByOffer.set(row.offer_id, row.price_usd);
    }

    return withContext;
  }

  // Reconstructs "catalog value at window start" by reversing the net
  // observed price deltas from the current total — not a persisted daily
  // snapshot (none exists), so this is a real but approximate value: it
  // misses offers added mid-window or whose only price change happened
  // before an earlier, unobserved point. Documented, not silently precise.
  private async computeCatalogValueGrowth(priceHistoryContext: PriceHistoryContext[]): Promise<CatalogValueGrowth | null> {
    const { data: activeOffers } = await this.client.from("offers").select("price_usd").eq("in_stock", true);
    const currentTotal = ((activeOffers ?? []) as { price_usd: number }[]).reduce(
      (sum, o) => sum + (o.price_usd ?? 0),
      0
    );

    const netChangeInWindow = priceHistoryContext.reduce((sum, row) => {
      if (row.previousPriceUsd === null) return sum;
      return sum + (row.priceUsd - row.previousPriceUsd);
    }, 0);

    return computeCatalogValueGrowth([
      { date: "window_start", totalValueUsd: currentTotal - netChangeInWindow },
      { date: "window_end", totalValueUsd: currentTotal },
    ]);
  }

  private async computeBuyerSavings(priceHistoryContext: PriceHistoryContext[]): Promise<BuyerSavingsSummary> {
    const highestByOffer = new Map<string, number>();
    for (const row of priceHistoryContext) {
      highestByOffer.set(row.offerId, Math.max(highestByOffer.get(row.offerId) ?? 0, row.priceUsd));
    }

    const offerIds = Array.from(highestByOffer.keys());
    if (offerIds.length === 0) return computeBuyerSavings([]);

    const { data: currentOffers } = await this.client.from("offers").select("id, price_usd").in("id", offerIds);
    const currentPriceById = new Map(
      ((currentOffers ?? []) as { id: string; price_usd: number }[]).map((o) => [o.id, o.price_usd])
    );

    const ranges = offerIds.map((offerId) => ({
      highestPriceUsd: highestByOffer.get(offerId) ?? 0,
      currentPriceUsd: currentPriceById.get(offerId) ?? highestByOffer.get(offerId) ?? 0,
    }));

    return computeBuyerSavings(ranges);
  }
}

function groupByStore(rows: PriceHistoryContext[]): Map<string, { recordedAt: string }[]> {
  const map = new Map<string, { recordedAt: string }[]>();
  for (const row of rows) {
    const list = map.get(row.storeId) ?? [];
    list.push({ recordedAt: row.recordedAt });
    map.set(row.storeId, list);
  }
  return map;
}

function buildPriceChangesByCategory(rows: PriceHistoryContext[]): Map<string, PriceChangeEvent[]> {
  const map = new Map<string, PriceChangeEvent[]>();
  for (const row of rows) {
    if (row.previousPriceUsd === null || row.categoryId === null) continue;
    const list = map.get(row.categoryId) ?? [];
    list.push({ priceUsd: row.priceUsd, previousPriceUsd: row.previousPriceUsd, recordedAt: row.recordedAt });
    map.set(row.categoryId, list);
  }
  return map;
}
