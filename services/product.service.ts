import { supabase } from "@/lib/supabase";
import { Product, ProductWithRelations, ProductCatalogItem } from "@/types/product";
import { escapeLikePattern } from "@/utils/search";
import { getCategoryBySlug } from "@/services/category.service";
import { getBrandBySlug } from "@/services/brand.service";
import { getStoreBySlug } from "@/services/store.service";

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*");

  if (error) {
    console.error(error);
    return [];
  }

  return data as Product[];
}

// Sitemap-index support (Release 1.7 — Wave 6): counts/paginates by slug
// only, so a catalog that grows into the millions can be chunked into
// multiple sitemap files (Google's ~50k URL-per-file limit) without ever
// loading the full product catalog into memory the way getProducts() does.
export async function getProductSlugsCount(): Promise<number> {
  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .not("slug", "is", null);

  if (error) {
    console.error(error);
    return 0;
  }

  return count ?? 0;
}

export async function getProductSlugsPage(offset: number, limit: number): Promise<string[]> {
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .not("slug", "is", null)
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error(error);
    return [];
  }

  return (data ?? []).map((row) => row.slug as string);
}

export async function getProductBySlug(
  slug: string
): Promise<ProductWithRelations | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*, brand:brands(*), category:categories(*)")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data as ProductWithRelations;
}

// Mission 03 (Decision Engine) — related products must never rank a
// same-category, wildly-different-price-tier product above a same-brand,
// same-tier one just because both happen to share a category. Takes the
// reference Product itself (not loose ids) because ranking needs its brand
// and its price, not only its category.
//
// Brand is the primary sort key and price proximity the secondary one: a
// same-brand candidate always outranks a different-brand one, however close
// the latter's price happens to be. Price distance only ever sorts a
// candidate lower — it never excludes one (see the third case in
// services/__tests__/product.service.test.ts).
// Sprint 6 (P2-3): teto de candidatos lidos ANTES do ranking. Não é o `limit`
// pedido pelo chamador — é a proteção de volume que substitui o `.limit(limit)`
// que truncava o conjunto antes de rankear.
//
// 120 não é número redondo escolhido a esmo; é o menor teto que satisfaz as
// três restrições medidas:
//
//  1. LIMITE REAL DE URI (medido no stack local). A leitura de preços abaixo
//     usa `.in("product_id", [...])`, um UUID (36 chars) por candidato na
//     query string. Bisecção contra o PostgREST local: 210 ids = 7.851 bytes
//     → HTTP 200; 220 ids = 8.221 bytes → HTTP 414 URI Too Long. O teto duro
//     é o limite de 8 KB do Kong. 120 ids ≈ 4.5 KB deixa ~45% de folga para o
//     produto de referência e para qualquer filtro futuro.
//  2. CATEGORIAS REAIS. No banco local a maior categoria tem 11 produtos
//     (média 6). Em produção, `docs/product/CATEGORY_INVENTORY_REPORT.md`
//     mede que apenas as ~11 maiores das 929 categorias passam de 120 — e
//     essas são buckets de fallback do merchant (GENERAL 2.142,
//     ELECTRONICOS 519, os buckets de perfume), não categorias de produto de
//     verdade. Para >98% das categorias o ranking passa a ser exato.
//  3. CUSTO. `products_category_id_idx` já existe (database/migrations/0004),
//     então a leitura é um index scan limitado a 120 linhas — não um seq scan.
//
// Limitação que permanece, nomeada em vez de escondida: nas ~11 categorias
// acima de 120 produtos a truncagem continua existindo (e sem ORDER BY, o
// subconjunto é arbitrário). Resolver isso exige buscar candidatos da mesma
// marca em consulta própria — mudança de estratégia de busca, fora do escopo
// desta missão, que é "rankear antes de limitar".
const RELATED_CANDIDATE_CAP = 120;

export async function getRelatedProducts(
  product: Product,
  limit = 4
): Promise<Product[]> {
  if (!product.category_id) return [];

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", product.category_id)
    .neq("id", product.id)
    .limit(RELATED_CANDIDATE_CAP);

  if (error) {
    console.error(error);
    return [];
  }

  const candidates = (data ?? []) as Product[];
  if (candidates.length === 0) return [];

  // Prices live on the offer, never on the product (DOMAIN_MODEL.md), so the
  // reference price and every candidate price come from one batched read —
  // never one query per candidate.
  const { data: offerRows, error: offerError } = await supabase
    .from("offers")
    .select("product_id, price_usd")
    .in("product_id", [product.id, ...candidates.map((candidate) => candidate.id)]);

  if (offerError) {
    console.error(offerError);
  }

  const lowestPriceByProductId = new Map<string, number>();
  for (const row of (offerRows ?? []) as { product_id: string; price_usd: number }[]) {
    if (typeof row.price_usd !== "number") continue;
    const current = lowestPriceByProductId.get(row.product_id);
    if (current === undefined || row.price_usd < current) {
      lowestPriceByProductId.set(row.product_id, row.price_usd);
    }
  }

  const referencePrice = lowestPriceByProductId.get(product.id);

  // Infinity for anything unpriceable — sorts last, is never dropped.
  function priceDistance(candidate: Product): number {
    const candidatePrice = lowestPriceByProductId.get(candidate.id);
    if (referencePrice === undefined || referencePrice <= 0 || candidatePrice === undefined) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.abs(candidatePrice - referencePrice) / referencePrice;
  }

  // Sprint 6 (P2-3): `.slice(limit)` vem DEPOIS do sort. Antes, o corte
  // acontecia na query (`.limit(limit)`), então o ranking só reordenava um
  // subconjunto arbitrário que o banco tinha devolvido — a prioridade de
  // marca e a proximidade de preço nunca chegavam a ser aplicadas sobre a
  // categoria inteira. Caso concreto: para o iPhone 16 Pro, o iPhone 16 Plus
  // (mesma marca, distância de preço 0,025 — a menor de todas) era descartado
  // antes de ser comparado, e entravam dois Samsung com distância 0,17 e 0,21.
  // A fórmula de ranking abaixo é a original, inalterada.
  return [...candidates]
    .sort((a, b) => {
      const aSameBrand = a.brand_id === product.brand_id;
      const bSameBrand = b.brand_id === product.brand_id;
      if (aSameBrand !== bSameBrand) return aSameBrand ? -1 : 1;

      const aDistance = priceDistance(a);
      const bDistance = priceDistance(b);
      // Equality guard keeps Infinity - Infinity (NaN) out of the comparator.
      if (aDistance === bDistance) return 0;
      return aDistance - bDistance;
    })
    .slice(0, limit);
}

export async function searchProducts(search: string) {
  const { data } = await supabase
    .from("products")
    .select("*")
    .ilike("name", `%${search}%`);

  return data;
}

export type ProductCatalogSort =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "best_selling"
  | "top_rated";

export interface ProductCatalogFilters {
  categorySlug?: string;
  brandSlug?: string;
  storeSlug?: string;
  search?: string;
  onlyInStock?: boolean;
  minPriceUSD?: number;
  maxPriceUSD?: number;
  sort?: ProductCatalogSort;
  page?: number;
  perPage?: number;
}

export interface ProductCatalogResult {
  products: ProductCatalogItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

const DEFAULT_PER_PAGE = 12;

type CatalogOfferRow = {
  price_usd: number;
  in_stock: boolean;
};

type CatalogProductRow = ProductWithRelations & { offers: CatalogOfferRow[] };

// Forma mínima do query builder do supabase-js que `applyOfferFilters`
// precisa. Estrutural em vez de importar PostgrestFilterBuilder: os dois
// builders usados (com e sem `count`) têm genéricos diferentes, e só estes
// três métodos são chamados.
interface OfferFilterable<T> {
  eq(column: string, value: string | number | boolean): T;
  gte(column: string, value: string | number): T;
  lte(column: string, value: string | number): T;
}

// Catálogo de produtos (/products): combina os filtros de category/brand/
// search (colunas nativas de "products") com os de store/availability/price
// (colunas de "offers", já que preço/estoque pertencem à oferta, não ao
// produto — ver docs/architecture/DOMAIN_MODEL.md). Quando nenhum filtro de oferta está
// ativo, usa "offers!left" para não esconder produtos ainda sem oferta
// cadastrada; quando algum está, troca para "offers!inner" para de fato
// restringir os produtos retornados.
export async function getProductsCatalog(
  filters: ProductCatalogFilters = {}
): Promise<ProductCatalogResult> {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? DEFAULT_PER_PAGE;

  const [category, brand, store] = await Promise.all([
    filters.categorySlug ? getCategoryBySlug(filters.categorySlug) : null,
    filters.brandSlug ? getBrandBySlug(filters.brandSlug) : null,
    filters.storeSlug ? getStoreBySlug(filters.storeSlug) : null,
  ]);

  const hasPriceFilter =
    filters.minPriceUSD !== undefined || filters.maxPriceUSD !== undefined;
  const needsOfferFilter = Boolean(store) || Boolean(filters.onlyInStock) || hasPriceFilter;
  const offersEmbed = needsOfferFilter ? "offers!inner" : "offers!left";

  const from = (page - 1) * perPage;

  // Sprint 7B (P2-1): os filtros de nível de oferta ficam num único lugar,
  // aplicados igualmente à consulta padrão e à consulta da página ordenada
  // por preço. Se divergissem, `lowestPriceUSD` mudaria conforme o `sort` —
  // exatamente o tipo de inconsistência que a Sprint 5 acabou de fechar.
  const applyOfferFilters = <T extends OfferFilterable<T>>(q: T): T => {
    let out = q;
    // `available=false` (arquivada) nunca forma preço — ver bloco original
    // abaixo e ADR-008. Não é filtro opcional: é a definição de oferta ativa.
    out = out.eq("offers.available", true);
    if (store) out = out.eq("offers.store_id", store.id);
    if (filters.onlyInStock) out = out.eq("offers.in_stock", true);
    if (filters.minPriceUSD !== undefined) out = out.gte("offers.price_usd", filters.minPriceUSD);
    if (filters.maxPriceUSD !== undefined) out = out.lte("offers.price_usd", filters.maxPriceUSD);
    return out;
  };

  const mapRows = (rows: CatalogProductRow[]): ProductCatalogItem[] =>
    rows.map((row) => {
      const { offers, ...product } = row;
      const prices = (offers ?? [])
        .map((offer) => offer.price_usd)
        .filter((price): price is number => typeof price === "number");
      return {
        ...product,
        lowestPriceUSD: prices.length > 0 ? Math.min(...prices) : null,
        inStock: (offers ?? []).some((offer) => offer.in_stock),
      };
    });

  // ── Ordenação GLOBAL por preço (P2-1) ────────────────────────────────────
  // "Preço do produto" é MIN(offers.price_usd) — uma agregação. O PostgREST
  // recusa ordenar por agregação de relação to-many (PGRST118/PGRST123,
  // verificado), então a ordem+paginação vão para a RPC
  // `search_products_catalog` (migration 20260809120000), que filtra ->
  // agrega -> ordena -> pagina nessa ordem, no banco. Antes, o `.range()`
  // paginava por `created_at` e o preço só reordenava os 12 itens já
  // buscados: o menor preço do catálogo caía na página 2 (ADR-011).
  //
  // A RPC devolve apenas os ids da página, já ordenados, mais o total. As
  // linhas completas vêm da MESMA consulta embutida de sempre, com os MESMOS
  // filtros — então `lowestPriceUSD`/`inStock` continuam sendo calculados
  // pelo mesmo caminho, sem uma segunda definição de preço a manter.
  if (filters.sort === "price_asc" || filters.sort === "price_desc") {
    const rpcArgs = {
      p_category_id: category?.id ?? null,
      p_brand_id: brand?.id ?? null,
      p_store_id: store?.id ?? null,
      p_search: filters.search?.trim() ? escapeLikePattern(filters.search.trim()) : null,
      p_only_in_stock: filters.onlyInStock ?? false,
      p_min_price: filters.minPriceUSD ?? null,
      p_max_price: filters.maxPriceUSD ?? null,
      p_sort: filters.sort,
      p_limit: perPage,
      p_offset: from,
    };

    const { data: ranked, error: rpcError } = await supabase.rpc(
      "search_products_catalog",
      rpcArgs
    );

    if (rpcError) {
      console.error(rpcError);
      return { products: [], total: 0, page, perPage, totalPages: 0 };
    }

    const rankedRows = (ranked ?? []) as { product_id: string; total_count: number }[];

    // Página além do total: o PostgREST devolvia 0 linhas mas mantinha o
    // `count` exato, então a UI seguia mostrando "N produtos encontrados".
    // A RPC não tem linhas para carregar o total nesse caso — uma segunda
    // chamada barata (1 linha) preserva o comportamento anterior.
    if (rankedRows.length === 0) {
      const { data: probe } = await supabase.rpc("search_products_catalog", {
        ...rpcArgs,
        p_limit: 1,
        p_offset: 0,
      });
      const total = ((probe ?? []) as { total_count: number }[])[0]?.total_count ?? 0;
      return {
        products: [],
        total,
        page,
        perPage,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      };
    }

    const orderedIds = rankedRows.map((row) => row.product_id);
    const total = Number(rankedRows[0].total_count);

    let pageQuery = supabase
      .from("products")
      .select(`*, brand:brands(*), category:categories(*), offers!left(price_usd, in_stock)`)
      .in("id", orderedIds);
    pageQuery = applyOfferFilters(pageQuery);

    const { data: pageRows, error: pageError } = await pageQuery;

    if (pageError) {
      console.error(pageError);
      return { products: [], total: 0, page, perPage, totalPages: 0 };
    }

    // `.in()` não preserva ordem; reordena os <=12 itens da página conforme a
    // ordem que o banco já decidiu. Isto não é ordenar o catálogo em
    // JavaScript — a ordenação global aconteceu no ORDER BY da RPC.
    const byId = new Map(mapRows((pageRows ?? []) as unknown as CatalogProductRow[]).map((p) => [p.id, p]));
    const products = orderedIds
      .map((id) => byId.get(id))
      .filter((p): p is ProductCatalogItem => p !== undefined);

    return {
      products,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  }

  let query = supabase
    .from("products")
    .select(
      `*, brand:brands(*), category:categories(*), ${offersEmbed}(price_usd, in_stock)`,
      { count: "exact" }
    );

  if (category) query = query.eq("category_id", category.id);
  if (brand) query = query.eq("brand_id", brand.id);
  if (filters.search?.trim()) {
    query = query.ilike("name", `%${escapeLikePattern(filters.search.trim())}%`);
  }
  // Sprint 5 (P2-2): oferta arquivada (`available=false`) nunca pode formar o
  // preço anunciado no catálogo — ver `applyOfferFilters` acima, hoje o único
  // lugar onde esses filtros vivem, compartilhado com o caminho da RPC.
  query = applyOfferFilters(query);

  // Caminho padrão (`newest`, `relevance`, `best_selling`, `top_rated`):
  // inalterado. "best_selling"/"top_rated" ainda não têm coluna de apoio
  // (estrutura preparada, conforme missão) e continuam caindo em
  // `created_at`. `price_asc`/`price_desc` nunca chegam aqui — saem antes,
  // pela RPC, que é o que os torna globalmente ordenados (P2-1/ADR-011).
  query = query.order("created_at", { ascending: false });

  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error(error);
    return { products: [], total: 0, page, perPage, totalPages: 0 };
  }

  const products = mapRows((data ?? []) as unknown as CatalogProductRow[]);

  // Sprint 7B (P2-1): o reordenamento em JavaScript que existia aqui foi
  // removido, não substituído. Ele só conseguia ordenar os 12 itens que o
  // `.range()` já havia trazido — era a causa raiz do P2-1. Ordenação por
  // preço agora sai pela RPC, acima, e nunca alcança este ponto.

  const total = count ?? 0;

  return {
    products,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}
