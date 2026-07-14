import type { SupabaseClient } from "@supabase/supabase-js";
import { createMarketplaceOperationsServices } from "./marketplace-operations-factory";
import { createExchangeServices } from "./exchange-factory";
import { createRealtimeCommerceServices } from "./realtime-commerce-factory";
import { createBuyerIntelligenceServices } from "./buyer-intelligence-factory";
import { ConnectorDirectoryService } from "./connector-directory-service";
import { Currency, CurrencyPair } from "@/src/domains/exchange";
import type { MoneyPresentation, MoneySavingsPresentation } from "@/src/domains/exchange";
import { ChangeType } from "@/src/domains/realtime-commerce";
import { getStoreBySlug } from "@/services/store.service";
import { getCategories } from "@/services/category.service";

// Release 1.9 — Program F — Wave 1 (Premium Home Experience). This is the
// ONLY place the Home/Categorias pages read data from — every function here
// composes an already-existing strategic domain service (Market Intelligence,
// Marketplace Operations, Exchange, Real-Time Commerce, Connector Platform).
// No business logic lives in a React component; every component this feeds
// receives plain, display-ready data.

// ── Stats (Hero + Stats block) ───────────────────────────────────────────────

export interface HomeStats {
  stores: number;
  products: number;
  offers: number;
  categories: number;
}

export async function getHomeStats(client: SupabaseClient): Promise<HomeStats> {
  const { metricsService } = createMarketplaceOperationsServices(client);
  const snapshot = await metricsService.snapshot();
  return {
    stores: snapshot.stores,
    products: snapshot.products,
    offers: snapshot.offers,
    categories: snapshot.categories,
  };
}

// ── Market Pulse ──────────────────────────────────────────────────────────

export interface MarketMoverHighlight {
  productName: string;
  storeName: string | null;
  previousValue: string | null;
  currentValue: string | null;
  percentChange: number;
  detectedAt: string;
}

export interface VolatileProductHighlight {
  productName: string;
  score: number;
  classification: string;
}

export interface MarketPulseHighlights {
  topDrops: MarketMoverHighlight[];
  topGains: MarketMoverHighlight[];
  mostVolatile: VolatileProductHighlight[];
  recentlyUpdatedCount: number;
  /** Real counts scoped to the last 24h ("hoje"/"agora" framing) — distinct
   * from `topDrops`/`topGains` (7-day window, for the ranked lists). */
  dropsCountToday: number;
  gainsCountToday: number;
  newProductsToday: number;
  /** Real `pricesChangedCount` per day, oldest → newest, for the dashboard
   * strip's sparkline — never a fabricated shape, one `computeForRange` call
   * per day. */
  dailyChangeSeries: number[];
}

const MARKET_PULSE_WINDOW_DAYS = 7;
const MARKET_PULSE_LIMIT = 5;
const SPARKLINE_DAYS = 7;

async function getDailyChangeSeries(marketPulseService: ReturnType<typeof createRealtimeCommerceServices>["marketPulseService"]): Promise<number[]> {
  const now = Date.now();
  const days = Array.from({ length: SPARKLINE_DAYS }, (_, i) => SPARKLINE_DAYS - 1 - i);

  const counts = await Promise.all(
    days.map(async (daysAgo) => {
      const dayEnd = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
      const dayStart = new Date(dayEnd.getTime() - 24 * 60 * 60 * 1000);
      const snapshot = await marketPulseService.computeForRange(dayStart, dayEnd);
      return snapshot.pricesChangedCount;
    })
  );

  return counts;
}

export async function getMarketPulseHighlights(client: SupabaseClient): Promise<MarketPulseHighlights> {
  const { marketPulseService, volatilityService } = createRealtimeCommerceServices(client);

  const to = new Date();
  const from = new Date(to.getTime() - MARKET_PULSE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const todayStart = new Date(to.getTime() - 24 * 60 * 60 * 1000);

  const [movers, snapshot, todaySnapshot, dailyChangeSeries] = await Promise.all([
    marketPulseService.getTopMovers(from, to, 30),
    marketPulseService.computeForRange(from, to),
    marketPulseService.computeForRange(todayStart, to),
    getDailyChangeSeries(marketPulseService),
  ]);

  const toHighlight = (m: (typeof movers)[number]): MarketMoverHighlight => ({
    productName: m.productName,
    storeName: m.storeName,
    previousValue: m.previousValue,
    currentValue: m.currentValue,
    percentChange: m.percentChange,
    detectedAt: m.detectedAt,
  });

  const topDrops = movers
    .filter((m) => m.changeType === ChangeType.PriceDecreased)
    .sort((a, b) => a.percentChange - b.percentChange)
    .slice(0, MARKET_PULSE_LIMIT)
    .map(toHighlight);

  const topGains = movers
    .filter((m) => m.changeType === ChangeType.PriceIncreased)
    .sort((a, b) => b.percentChange - a.percentChange)
    .slice(0, MARKET_PULSE_LIMIT)
    .map(toHighlight);

  const distinctProductIds = [...new Map(movers.map((m) => [m.productId, m])).entries()];
  const volatilityScored = await Promise.all(
    distinctProductIds.map(async ([productId, mover]) => ({
      productName: mover.productName,
      volatility: await volatilityService.computeForProduct(productId),
    }))
  );

  const mostVolatile: VolatileProductHighlight[] = volatilityScored
    .filter((v) => v.volatility.sampleSize >= 2)
    .sort((a, b) => b.volatility.score - a.volatility.score)
    .slice(0, MARKET_PULSE_LIMIT)
    .map((v) => ({ productName: v.productName, score: v.volatility.score, classification: v.volatility.classification }));

  return {
    topDrops,
    topGains,
    mostVolatile,
    recentlyUpdatedCount: snapshot.pricesChangedCount,
    dropsCountToday: todaySnapshot.pricesDroppedCount,
    gainsCountToday: todaySnapshot.pricesRaisedCount,
    newProductsToday: todaySnapshot.productsAddedCount,
    dailyChangeSeries,
  };
}

// ── Economia do Dia / Ofertas Relâmpago ──────────────────────────────────────

export interface SavingsHighlight {
  canonicalProductId: string;
  productName: string;
  /** The winning (cheapest) raw offer's own product slug — `/product/[slug]`
   * looks up `products.slug`, not the canonical product's slug, so this is
   * never `product.canonicalSlug`. `null` when that offer's product row has
   * no slug (rare, but a dead link would be worse than no link). */
  productSlug: string | null;
  cheapestStoreName: string;
  oldPriceUSD: number;
  newPriceUSD: number;
  savingsUSD: number;
  savingsPercent: number;
  /** Program ΔR — Mission ΔR-1.2 (Universal Price Presentation). Produced
   * exclusively by PricePresentationService — AchadoDoDia/FlashOffersCard
   * never format or convert currency themselves. */
  price: MoneyPresentation;
  savings: MoneySavingsPresentation;
}

/** Release 2.0 — Experience Iteration 6.5 (Opportunity Engine). Both
 * "Achado do Dia" (the single top pick) and "Economia do dia" (a ranked
 * list, dashboard strip) now read from the same OpportunityEngine —
 * see docs/product/OPPORTUNITY_ENGINE_ARCHITECTURE.md. This function only
 * resolves the human-readable extras (product slug, store name) the engine
 * deliberately leaves as raw-table lookups, same precedent as
 * app/product/[slug]/_cache.ts's getProductBestDeal for the store name. */
async function rankOpportunities(client: SupabaseClient, limit: number): Promise<SavingsHighlight[]> {
  const { opportunityEngine } = createBuyerIntelligenceServices(client);
  const { presentationService } = createExchangeServices(client);
  const opportunities = await opportunityEngine.getTopOpportunities(limit);

  const storeNamesByStoreSlug = new Map<string, string>();
  const productSlugByProductId = new Map<string, string | null>();

  await Promise.all(
    opportunities.map(async (o) => {
      if (!storeNamesByStoreSlug.has(o.cheapestStoreSlug)) {
        const store = await getStoreBySlug(o.cheapestStoreSlug);
        storeNamesByStoreSlug.set(o.cheapestStoreSlug, store?.name ?? o.cheapestStoreSlug);
      }
      if (!productSlugByProductId.has(o.winningOfferProductId)) {
        const { data: winningProduct } = await client
          .from("products")
          .select("slug")
          .eq("id", o.winningOfferProductId)
          .maybeSingle();
        productSlugByProductId.set(o.winningOfferProductId, (winningProduct?.slug as string | undefined) ?? null);
      }
    })
  );

  return Promise.all(
    opportunities.map(async (o) => {
      const [price, savings] = await Promise.all([
        presentationService.present({ amountUSD: o.newPriceUSD }),
        presentationService.presentSavings({ amountUSD: o.savingsUSD, percent: o.savingsPercent }),
      ]);

      return {
        canonicalProductId: o.canonicalProductId,
        productName: o.productName,
        productSlug: productSlugByProductId.get(o.winningOfferProductId) ?? null,
        cheapestStoreName: storeNamesByStoreSlug.get(o.cheapestStoreSlug) ?? o.cheapestStoreSlug,
        oldPriceUSD: o.oldPriceUSD,
        newPriceUSD: o.newPriceUSD,
        savingsUSD: o.savingsUSD,
        savingsPercent: o.savingsPercent,
        price,
        savings,
      };
    })
  );
}

export async function getBestSavingsToday(client: SupabaseClient): Promise<SavingsHighlight | null> {
  const [best] = await rankOpportunities(client, 1);
  return best ?? null;
}

const FLASH_OFFERS_LIMIT = 6;

export async function getFlashOffers(client: SupabaseClient): Promise<SavingsHighlight[]> {
  return rankOpportunities(client, FLASH_OFFERS_LIMIT);
}

// ── Câmbio ao Vivo ────────────────────────────────────────────────────────

export interface ExchangeRatePoint {
  rate: number;
  capturedAt: string;
}

export interface ExchangeSnapshot {
  usdBrl: ExchangeRatePoint | null;
  usdPyg: ExchangeRatePoint | null;
  usingFallback: boolean;
  history: ExchangeRatePoint[];
  /** Release 1.9 — Program F — Wave 2 (v0 realignment): the v0 ExchangeCard
   * shows two rate columns, each with its own sparkline/trend — added
   * symmetrically to the existing USD/BRL history fetch, never fabricated. */
  usdPygHistory: ExchangeRatePoint[];
}

const EXCHANGE_HISTORY_DAYS = 7;

export async function getExchangeSnapshot(client: SupabaseClient): Promise<ExchangeSnapshot> {
  const { rateService, historyService } = createExchangeServices(client);

  const to = new Date();
  const from = new Date(to.getTime() - EXCHANGE_HISTORY_DAYS * 24 * 60 * 60 * 1000);

  const [usdBrl, usdPyg, history, usdPygHistory] = await Promise.all([
    rateService.getCurrentRate(CurrencyPair.UsdBrl),
    rateService.getCurrentRate(CurrencyPair.UsdPyg),
    historyService.getRange(CurrencyPair.UsdBrl, from, to),
    historyService.getRange(CurrencyPair.UsdPyg, from, to),
  ]);

  return {
    usdBrl: usdBrl ? { rate: usdBrl.rate, capturedAt: usdBrl.capturedAt } : null,
    usdPyg: usdPyg ? { rate: usdPyg.rate, capturedAt: usdPyg.capturedAt } : null,
    usingFallback: false,
    history: history.map((h) => ({ rate: h.rate, capturedAt: h.capturedAt })),
    usdPygHistory: usdPygHistory.map((h) => ({ rate: h.rate, capturedAt: h.capturedAt })),
  };
}

// ── Live Marketplace (recent updates ticker) ─────────────────────────────────

export interface LiveMarketplaceEntry {
  productName: string;
  storeName: string | null;
  newPriceUSD: string | null;
  occurredAt: string;
}

const LIVE_FEED_LIMIT = 8;

export async function getLiveMarketplaceFeed(client: SupabaseClient): Promise<LiveMarketplaceEntry[]> {
  const { marketPulseService } = createRealtimeCommerceServices(client);
  const to = new Date();
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);

  const movers = await marketPulseService.getTopMovers(from, to, LIVE_FEED_LIMIT);
  return movers
    .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
    .map((m) => ({
      productName: m.productName,
      storeName: m.storeName,
      newPriceUSD: m.currentValue,
      occurredAt: m.detectedAt,
    }));
}

// ── Lojas em Destaque ─────────────────────────────────────────────────────

export interface FeaturedStoreHighlight {
  slug: string;
  name: string;
  coverImage: string | null;
  isVerified: boolean;
  offerCount: number;
  qualityScore: number | null;
  lastSyncAt: string | null;
  rating: number;
}

const FEATURED_STORES_LIMIT = 6;

export async function getFeaturedStores(client: SupabaseClient): Promise<FeaturedStoreHighlight[]> {
  const { priorityService } = createMarketplaceOperationsServices(client);
  const priorities = await priorityService.listAll();

  const top = [...priorities].sort((a, b) => b.score - a.score).slice(0, FEATURED_STORES_LIMIT);

  const directory = new ConnectorDirectoryService(client);
  const connectorEntries = await directory.listAll();
  const connectorByStoreSlug = new Map(connectorEntries.map((e) => [e.storeSlug, e]));

  const results = await Promise.all(
    top.map(async (priority) => {
      const store = await getStoreBySlug(priority.storeSlug);
      const { count } = await client
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("store_id", priority.storeId);

      const connector = connectorByStoreSlug.get(priority.storeSlug);

      return {
        slug: priority.storeSlug,
        name: priority.storeName,
        coverImage: store?.cover_image ?? null,
        isVerified: store?.is_verified ?? false,
        offerCount: count ?? 0,
        qualityScore: connector?.healthScore ?? null,
        lastSyncAt: connector?.lastSyncAt ?? null,
        // Release 1.9 — Program F — Wave 2 (v0 realignment): exposed here so
        // StoreCarousel.tsx no longer needs its own getStoreBySlug() call per
        // store just to read this one field (HOME_AUDIT_2026_07_06.md §2).
        rating: store?.rating ?? 0,
      };
    })
  );

  return results;
}

// ── Categorias ────────────────────────────────────────────────────────────

export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  productCount: number;
  offerCount: number;
}

/** `MarketplaceCoverageService.byCategory` gives product counts (products
 * carry `category_id` directly) but not offer counts (an offer's category
 * is one join further, through its product) — a real, distinct number the
 * Wave brief asks for by name ("Quantidade de produtos. Quantidade de
 * ofertas."), computed here with one grouped read rather than a second
 * per-category round trip. */
async function getOfferCountsByCategory(client: SupabaseClient): Promise<Map<string, number>> {
  const { data } = await client.from("offers").select("products(category_id)");
  const counts = new Map<string, number>();

  for (const row of data ?? []) {
    const productRelation = row.products as { category_id: string | null } | { category_id: string | null }[] | null;
    const product = Array.isArray(productRelation) ? productRelation[0] : productRelation;
    if (!product?.category_id) continue;
    counts.set(product.category_id, (counts.get(product.category_id) ?? 0) + 1);
  }

  return counts;
}

async function getCategoriesWithCounts(client: SupabaseClient): Promise<CategoryWithCount[]> {
  const { coverageService } = createMarketplaceOperationsServices(client);
  const [coverage, categories, offerCounts] = await Promise.all([
    coverageService.compute(),
    getCategories(),
    getOfferCountsByCategory(client),
  ]);

  const productCountById = new Map(coverage.byCategory.map((c) => [c.id, c.productCount]));

  return categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      productCount: productCountById.get(category.id) ?? 0,
      offerCount: offerCounts.get(category.id) ?? 0,
    }))
    .sort((a, b) => b.productCount - a.productCount);
}

// Release 1.9 — Program F — Wave 2 (v0 realignment): the v0 CategoriesCard
// is a 5-column grid (9 real categories + a "Mais" link tile) rather than
// the previous 4-column/8-item layout.
const HOME_CATEGORIES_LIMIT = 9;

export async function getTopCategories(client: SupabaseClient): Promise<CategoryWithCount[]> {
  const all = await getCategoriesWithCounts(client);
  return all.slice(0, HOME_CATEGORIES_LIMIT);
}

export async function getAllCategoriesWithCounts(client: SupabaseClient): Promise<CategoryWithCount[]> {
  return getCategoriesWithCounts(client);
}

export { Currency };
