import { supabase } from "@/lib/supabase";
import { SearchResponse } from "@/types/search";
import { ProductCatalogItem, ProductWithRelations } from "@/types/product";
import { Store } from "@/types/store";
import { Brand } from "@/types/brand";
import { Category } from "@/types/category";
import { escapeLikePattern } from "@/utils/search";

// Sprint "Search Ordering + Out-of-Stock + SEO Recovery" (PR-001/PR-002).
//
// Ordenação GLOBAL no SQL (RPC search_products_global, migration
// 20260827000000): disponíveis (has_stock) primeiro, preço ASC NULLS LAST
// dentro de cada grupo, ID como desempate. A RPC substitui o antigo
// "buscar <=8 SEM ORDER BY e sort em JS", que ordenava um subconjunto
// arbitrário — nunca o resultado globalmente.
//
// Fallback seguro: enquanto a RPC não estiver aplicada no self-hosted
// (ação RED, aguardando aprovação), a busca DEGRADA para o caminho legado
// (mesmo sort determinístico em JS sobre as linhas buscadas) em vez de
// quebrar. Assim o /search nunca fica vazio — só não é global até a
// migration rodar.
//
// Same offers!left join pattern used by getProductsCatalog
// (services/product.service.ts) — offers!left so a product without any
// offer yet still appears (never hidden), just without a price badge.
type SearchProductRow = ProductWithRelations & { offers: { price_usd: number; in_stock: boolean; store_id: string }[] };

type SearchRankedId = { product_id: string; has_stock: boolean };

const RESULTS_PER_SECTION = 8;

function emptyResponse(query: string, durationMs = 0): SearchResponse {
  return {
    query,
    products: [],
    stores: [],
    brands: [],
    categories: [],
    total: 0,
    durationMs,
  };
}

// Regra canônica de ordenação dos produtos da busca (PR-001/PR-002):
//   Grupo 1 disponíveis (inStock) primeiro, price ASC;
//   Grupo 2 esgotados, price ASC;
//   sem preço (null) por último, nunca inventar um.
// Determinístico: comparações estáveis preservam ordem relativa de empates.
function rootlessRank(a: ProductCatalogItem, b: ProductCatalogItem): number {
  if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
  if (a.lowestPriceUSD === null && b.lowestPriceUSD === null) return 0;
  if (a.lowestPriceUSD === null) return 1;
  if (b.lowestPriceUSD === null) return -1;
  return a.lowestPriceUSD - b.lowestPriceUSD;
}

function mapProductRows(rows: SearchProductRow[]): ProductCatalogItem[] {
  return rows.map((row) => {
    const { offers, ...product } = row;
    // A query já exclui ofertas arquivadas via `.eq("offers.available", true)`
    // (ADR-008) — preço/variável de estoque aqui só sobre ofertas ativas.
    const validOffers = (offers ?? []).filter((offer) => typeof offer.price_usd === "number");
    const lowestOffer = validOffers.reduce<(typeof validOffers)[number] | null>(
      (lowest, offer) => (!lowest || offer.price_usd < lowest.price_usd ? offer : lowest),
      null
    );
    return {
      ...product,
      lowestPriceUSD: lowestOffer?.price_usd ?? null,
      inStock: (offers ?? []).some((offer) => offer.in_stock),
      // Release 2.0 — Wave 4 (Trust Experience) — the store behind the
      // displayed price, for TrustComposer.composeCompactForStores.
      lowestPriceStoreId: lowestOffer?.store_id ?? null,
    };
  });
}

// Retorna os produtos ordenados globalmente (disponíveis → esgotados,
// preço ASC) para a query. `pattern` já vem com os `%` de wildcard para o
// ILIKE do caminho legado; `escapedTerm` é o termo escapado (sem wildcard)
// para a RPC, que é quem envolve com `%` — evitando dupla envolvência.
// Tenta a RPC (ordenação no banco); em erro (RPC não aplicada no
// self-hosted) cai para o caminho legado.
async function fetchOrderedProducts(pattern: string, escapedTerm: string): Promise<ProductCatalogItem[]> {
  const { data: ranked, error: rpcError } = await supabase.rpc("search_products_global", {
    p_term: escapedTerm,
    p_limit: RESULTS_PER_SECTION,
    p_offset: 0,
  });

  if (!rpcError && Array.isArray(ranked) && ranked.length > 0) {
    const ids = ranked.map((r: SearchRankedId) => r.product_id);
    const { data, error } = await supabase
      .from("products")
      .select("*, brand:brands(*), category:categories(*), offers!left(price_usd, in_stock, store_id)")
      .eq("offers.available", true)
      .in("id", ids);

    if (!error && data) {
      // `.in()` não preserva ordem: reordena conforme a RPC já decidiu.
      const byId = new Map(mapProductRows(data as unknown as SearchProductRow[]).map((p) => [p.id, p]));
      const products = ids
        .map((id) => byId.get(id))
        .filter((p): p is ProductCatalogItem => p !== undefined);
      // A RPC ordena por has_stock → price ASC NULLS LAST → id. Reaplicamos a
      // regra canônica como last resort (ex.: a página não trouxe todas as
      // ofertas que formaram has_stock/price), com desempate determinístico
      // por slug apenas quando a regra canônica empata (ex.: mesmo preço).
      // Isso NUNCA move um produto para fora do seu grupo (disponível/esgotado)
      // nem inverte a ordem crescente de preço — só torna empates estáveis.
      return [...products].sort((a, b) => rootlessRank(a, b) || (a.slug < b.slug ? -1 : a.slug === b.slug ? 0 : 1));
    }
    // Se a reordenação falhar (select com erro), cai para o caminho legado.
  } else if (rpcError) {
    console.error("search_products_global (RPC não disponível?):", rpcError.message);
  }

  // ── Caminho legado (fallback): mesmo contrato de antes, porém o sort usa a
  // regra canônica determinística sobre as linhas buscadas.
  const { data, error } = await supabase
    .from("products")
    .select("*, brand:brands(*), category:categories(*), offers!left(price_usd, in_stock, store_id)")
    .eq("offers.available", true)
    .ilike("name", pattern)
    .limit(RESULTS_PER_SECTION);

  if (error || !data) {
    if (error) console.error(error);
    return [];
  }
  return [...mapProductRows(data as unknown as SearchProductRow[])].sort((a, b) => rootlessRank(a, b) || (a.slug < b.slug ? -1 : a.slug === b.slug ? 0 : 1));
}

export async function searchEverything(search: string): Promise<SearchResponse> {
  const query = search.trim();

  if (!query) {
    return emptyResponse(query);
  }

  const startedAt = Date.now();
  const escapedTerm = escapeLikePattern(query);
  const pattern = `%${escapedTerm}%`;

  const [storesResult, brandsResult, categoriesResult] = await Promise.all([
    supabase
      .from("stores")
      .select("*")
      .ilike("name", pattern)
      .limit(RESULTS_PER_SECTION),
    supabase
      .from("brands")
      .select("*")
      .ilike("name", pattern)
      .limit(RESULTS_PER_SECTION),
    supabase
      .from("categories")
      .select("*")
      .ilike("name", pattern)
      .limit(RESULTS_PER_SECTION),
  ]);

  const products = await fetchOrderedProducts(pattern, escapedTerm);

  // Queremos que a falha de TODOS os resultados (produtos + seções) vire erro
  // explícito, mas que uma seção individual que falhe só seja logada — a busca
  // segue no que deu certo.
  const resultsFailures = [storesResult.error, brandsResult.error, categoriesResult.error].filter(Boolean);
  if (resultsFailures.length === 3 && products.length === 0) {
    resultsFailures.forEach((e) => e && console.error(e));
    throw new Error("Não foi possível completar a busca. Tente novamente.");
  }
  resultsFailures.forEach((e) => e && console.error(e));

  const stores = (storesResult.data ?? []) as Store[];
  const brands = (brandsResult.data ?? []) as Brand[];
  const categories = (categoriesResult.data ?? []) as Category[];

  return {
    query,
    products,
    stores,
    brands,
    categories,
    total: products.length + stores.length + brands.length + categories.length,
    durationMs: Date.now() - startedAt,
  };
}
