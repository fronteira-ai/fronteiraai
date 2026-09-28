import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
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

/** P2 Public Catalog Visibility: ids das lojas PÚBLICAS (stores.active=true).
 * O gate é resolvido no consumidor público — MarketPulseService e
 * MarketplaceMetricsService são compartilhados com dashboards internos, que
 * precisam continuar enxergando loja inativa.
 *
 * Mission 02B.1 (P0-2) — `cache()` do React: memo de ESCOPO DE REQUISIÇÃO
 * (mesmo mecanismo já usado por app/product/[slug]/_cache.ts,
 * app/search/_cache.ts, app/lojas/[slug]/_cache.ts). Não é TTL, não é cache
 * persistente — a entrada morre com o render.
 *
 * Por que aqui, e não mecanicamente em tudo: esta é uma das poucas leituras
 * da Home que realmente acontece MAIS DE UMA VEZ no mesmo render — é chamada
 * por `getPublicCatalogCounts` (Hero), `getMarketPulseHighlights` e
 * `getLiveMarketplaceFeed`. Antes: 3 execuções da MESMA query; depois: 1.
 *
 * A chave do memo é o `client`; em produção ele é o singleton do processo
 * devolvido por `getSupabaseServiceClient()`, portanto os três consumidores
 * compartilham a entrada.
 *
 * SEM efeito colateral de bootstrap: o corpo apenas lê `stores` — nenhum
 * factory é instanciado aqui, então memoizar não altera a frequência de
 * nenhum bootstrap. A REGRA CRÍTICA (bootstrap) é o motivo pelo qual
 * `getHomeStats` e `getFeaturedStores` NÃO são memoizadas. */
const getActiveStoreIds = cache(async (client: SupabaseClient): Promise<Set<string>> => {
  const { data } = await client.from("stores").select("id").eq("active", true);
  return new Set(((data ?? []) as { id: string }[]).map((row) => row.id));
});

/** P2 Public Catalog Visibility: os números do Hero são contagens PÚBLICAS —
 * PUBLIC STORE (stores.active=true), PUBLIC OFFER (offers.available=true AND
 * stores.active=true) e PUBLIC PRODUCT (>=1 PUBLIC OFFER) — nunca totais de
 * banco. `categories` continua sendo o tamanho da taxonomia.
 *
 * Mission 02B.1 (P0-2) — passa a consumir `getActiveStoreIds` em vez de
 * repetir a própria consulta: MESMA query (`stores.id WHERE active=true`),
 * MESMO filtro, MESMO resultado — apenas deixa de ser a 3ª cópia no mesmo
 * render. O curto-circuito para lista vazia é preservado. */
async function getPublicCatalogCounts(client: SupabaseClient): Promise<{ stores: number; products: number; offers: number }> {
  const storeIds = [...(await getActiveStoreIds(client))];

  if (storeIds.length === 0) return { stores: 0, products: 0, offers: 0 };

  const { data: offerRows } = await client
    .from("offers")
    .select("product_id")
    .eq("available", true)
    .in("store_id", storeIds);

  const rows = (offerRows ?? []) as { product_id: string | null }[];
  const publicProductIds = new Set(
    rows.map((row) => row.product_id).filter((id): id is string => Boolean(id))
  );

  return { stores: storeIds.length, products: publicProductIds.size, offers: rows.length };
}

export async function getHomeStats(client: SupabaseClient): Promise<HomeStats> {
  const { metricsService } = createMarketplaceOperationsServices(client);
  const [snapshot, publicCounts] = await Promise.all([
    metricsService.snapshot(),
    getPublicCatalogCounts(client),
  ]);
  return {
    stores: publicCounts.stores,
    products: publicCounts.products,
    offers: publicCounts.offers,
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

// Program Σ — Sprint 1 (Home Fan-out Reduction). Reads the one count the
// sparkline actually plots, instead of computing a whole MarketPulseSnapshot
// per day and discarding everything but `pricesChangedCount`.
//
// `MarketPulseService.computeForRange()` costs 5 indexed COUNTs plus one
// `listInRange(..., BREAKDOWN_SAMPLE_LIMIT)` that fetches up to 3.000
// `market_changes` rows to build the category/store breakdown — a breakdown
// this function never reads. Seven days of that meant 35 COUNTs and 7
// large row fetches to produce 7 integers.
//
// The value is bit-for-bit the same: `computeForRange` derives
// `pricesChangedCount` from exactly this `countInRange` call with exactly
// these change types (MarketPulseService.ts), and `countInRange` uses
// `head: true` — an indexed COUNT that transfers no rows at all. Same
// windows, same filter, same numbers; only the discarded work is gone.
async function getDailyChangeSeries(changeRepo: ReturnType<typeof createRealtimeCommerceServices>["changeRepo"]): Promise<number[]> {
  const now = Date.now();
  const days = Array.from({ length: SPARKLINE_DAYS }, (_, i) => SPARKLINE_DAYS - 1 - i);

  const counts = await Promise.all(
    days.map(async (daysAgo) => {
      const dayEnd = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
      const dayStart = new Date(dayEnd.getTime() - 24 * 60 * 60 * 1000);
      return changeRepo.countInRange(dayStart, dayEnd, {
        changeTypes: [ChangeType.PriceIncreased, ChangeType.PriceDecreased],
      });
    })
  );

  return counts;
}

export async function getMarketPulseHighlights(client: SupabaseClient): Promise<MarketPulseHighlights> {
  const { marketPulseService, volatilityService, changeRepo } = createRealtimeCommerceServices(client);

  const to = new Date();
  const from = new Date(to.getTime() - MARKET_PULSE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const todayStart = new Date(to.getTime() - 24 * 60 * 60 * 1000);

  const [rawMovers, snapshot, todaySnapshot, dailyChangeSeries, activeStoreIds] = await Promise.all([
    marketPulseService.getTopMovers(from, to, 30),
    marketPulseService.computeForRange(from, to),
    marketPulseService.computeForRange(todayStart, to),
    getDailyChangeSeries(changeRepo),
    getActiveStoreIds(client),
  ]);

  // P2 Public Catalog Visibility: uma mudança cuja loja não é mais pública
  // (stores.active <> true) nunca é nomeada na Home. O gate acontece ANTES
  // de qualquer ranking/exibição — nunca removendo depois de ordenar.
  const movers = rawMovers.filter((m) => m.storeId === null || activeStoreIds.has(m.storeId));

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

/** "Economia do dia" shows this many opportunities; "Achado do Dia" shows the
 * first of the SAME ranked list. Sendo o MAIOR dos dois, é também o `limit` da
 * execução compartilhada do engine (Mission 02B.1, P0-1). */
const FLASH_OFFERS_LIMIT = 6;

/** Mission 02B.1 (P0-1) — a ÚNICA execução do pipeline caro do
 * OpportunityEngine por render/requisição.
 *
 * `getTopOpportunities(limit)` roda TODO o pipeline — amostra de candidatos
 * (`CANDIDATE_SAMPLE`), lote de ofertas (`SAVINGS_OFFER_FETCH_LIMIT`), gate
 * de estoque/frescor/economia, gate de timing e ranking — e usa `limit`
 * EXCLUSIVAMENTE no `ranked.slice(0, limit)` final. `limit` não participa da
 * seleção inicial, dos gates, do cálculo de economia, do timing, da
 * popularidade nem da ordenação.
 *
 * Logo `getTopOpportunities(1)` ≡ `getTopOpportunities(6).slice(0, 1)`, e é
 * exatamente isso que "Achado do Dia" passa a consumir: o PRIMEIRO elemento
 * da MESMA lista ordenada que "Economia do dia" já usa. Antes, os dois
 * rodavam o pipeline inteiro (duas vezes por render) para a mesma resposta.
 *
 * `cache()` do React é o mesmo memo de ESCOPO DE REQUISIÇÃO dos outros
 * _cache.ts do projeto — nunca `unstable_cache`, nunca TTL para ofertas: a
 * entrada morre com o render e nada sobre preço/estoque é persistido.
 *
 * Chave = `client` (o singleton do processo em produção), então FlashOffers
 * e AchadoDoDia compartilham a mesma execução. O `limit` compartilhado é
 * `FLASH_OFFERS_LIMIT` — o maior dos dois; o menor é obtido por `slice`. */
const getSharedOpportunities = cache(async (client: SupabaseClient) => {
  const { opportunityEngine } = createBuyerIntelligenceServices(client);
  return opportunityEngine.getTopOpportunities(FLASH_OFFERS_LIMIT);
});

/** Release 2.0 — Experience Iteration 6.5 (Opportunity Engine). Both
 * "Achado do Dia" (the single top pick) and "Economia do dia" (a ranked
 * list, dashboard strip) now read from the same OpportunityEngine —
 * see docs/product/OPPORTUNITY_ENGINE_ARCHITECTURE.md. This function only
 * resolves the human-readable extras (product slug, store name) the engine
 * deliberately leaves as raw-table lookups, same precedent as
 * app/product/[slug]/_cache.ts's getProductBestDeal for the store name.
 *
 * Mission 02B.1 (P0-1) — recebe a lista já ordenada da execução
 * compartilhada (`getSharedOpportunities`) e aplica o `slice(0, limit)` do
 * chamador. TODO o resto (resolução de nome de loja, slug do produto,
 * PricePresentationService) permanece idêntico, e continua rodando apenas
 * sobre as oportunidades efetivamente devolvidas — nunca sobre a lista
 * inteira. */
async function rankOpportunities(client: SupabaseClient, limit: number): Promise<SavingsHighlight[]> {
  const { presentationService } = createExchangeServices(client);
  const opportunities = (await getSharedOpportunities(client)).slice(0, limit);

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

  const [rawMovers, activeStoreIds] = await Promise.all([
    marketPulseService.getTopMovers(from, to, LIVE_FEED_LIMIT),
    getActiveStoreIds(client),
  ]);

  // P2 Public Catalog Visibility: o ticker é público — uma mudança de loja
  // não-pública (stores.active <> true) não é exibida, filtrada ANTES do sort.
  const movers = rawMovers.filter((m) => m.storeId === null || activeStoreIds.has(m.storeId));

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
  /** PR-004: logotipo oficial da loja (com fallback monograma na UI). */
  logoUrl: string | null;
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
      // P2 Public Catalog Visibility: PUBLIC STORE = stores.active=true.
      // getStoreBySlug já filtra, mas o null também pode significar loja
      // removida — nunca vira card público.
      if (!store || store.active !== true) return null;
      const { count } = await client
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("store_id", priority.storeId)
        .eq("available", true);

      const connector = connectorByStoreSlug.get(priority.storeSlug);

      return {
        slug: priority.storeSlug,
        name: priority.storeName,
        coverImage: store?.cover_image ?? null,
        logoUrl: store?.logo_url ?? null,
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

  return results.filter((r): r is NonNullable<typeof r> => r !== null);
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
async function getPublicCategoryMetrics(
  client: SupabaseClient
): Promise<{ offerCounts: Map<string, number>; productCounts: Map<string, number> }> {
  // P2 Public Catalog Visibility: só PUBLIC OFFER (available=true AND
  // stores.active=true) conta na Home/Categorias — e PUBLIC PRODUCT é o
  // produto que possui >=1 PUBLIC OFFER. Uma única leitura alimenta as duas
  // contagens (o produto de cada oferta é uma coluna da própria oferta).
  const { data } = await client
    .from("offers")
    .select("product_id, products(category_id), stores(active)")
    .eq("available", true);

  const offerCounts = new Map<string, number>();
  const productIdsByCategory = new Map<string, Set<string>>();

  for (const row of data ?? []) {
    const storeRelation = row.stores as { active: boolean | null } | { active: boolean | null }[] | null;
    const store = Array.isArray(storeRelation) ? storeRelation[0] : storeRelation;
    if (store?.active !== true) continue;

    const productRelation = row.products as { category_id: string | null } | { category_id: string | null }[] | null;
    const product = Array.isArray(productRelation) ? productRelation[0] : productRelation;
    if (!product?.category_id) continue;

    offerCounts.set(product.category_id, (offerCounts.get(product.category_id) ?? 0) + 1);

    const productId = row.product_id as string | null;
    if (!productId) continue;
    const productIds = productIdsByCategory.get(product.category_id) ?? new Set<string>();
    productIds.add(productId);
    productIdsByCategory.set(product.category_id, productIds);
  }

  return {
    offerCounts,
    productCounts: new Map(Array.from(productIdsByCategory, ([id, productIds]) => [id, productIds.size])),
  };
}

async function getCategoriesWithCounts(client: SupabaseClient): Promise<CategoryWithCount[]> {
  const [categories, publicMetrics] = await Promise.all([
    getCategories(),
    getPublicCategoryMetrics(client),
  ]);

  return categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      // P2: contagem pública, nunca o total de banco (produto sem PUBLIC
      // OFFER não entra; produto só ofertado por loja inativa também não).
      productCount: publicMetrics.productCounts.get(category.id) ?? 0,
      offerCount: publicMetrics.offerCounts.get(category.id) ?? 0,
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
