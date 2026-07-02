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

export async function getRelatedProducts(
  categoryId: string,
  excludeProductId: string,
  limit = 4
): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", categoryId)
    .neq("id", excludeProductId)
    .limit(limit);

  if (error) {
    console.error(error);
    return [];
  }

  return data as Product[];
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
  if (store) query = query.eq("offers.store_id", store.id);
  if (filters.onlyInStock) query = query.eq("offers.in_stock", true);
  if (filters.minPriceUSD !== undefined) {
    query = query.gte("offers.price_usd", filters.minPriceUSD);
  }
  if (filters.maxPriceUSD !== undefined) {
    query = query.lte("offers.price_usd", filters.maxPriceUSD);
  }

  // Ordenação por preço é uma agregação (MIN das ofertas) que o PostgREST
  // não resolve nativamente sem uma view/RPC dedicada (proposta em
  // database/migrations/0003_proposed_product_catalog_price_view.sql, não
  // aplicada — ver docs/operations/DECISIONS.md ADR-011). "best_selling"/"top_rated"
  // ainda não têm coluna de apoio (estrutura preparada, conforme missão) —
  // todos esses casos usam "created_at" como base e price_asc/price_desc é
  // corrigido depois, reordenando a página já buscada (best effort: correto
  // dentro da página exibida, não garante ordem global entre páginas).
  query = query.order("created_at", { ascending: false });

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error(error);
    return { products: [], total: 0, page, perPage, totalPages: 0 };
  }

  const rows = (data ?? []) as unknown as CatalogProductRow[];

  let products: ProductCatalogItem[] = rows.map((row) => {
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

  if (filters.sort === "price_asc" || filters.sort === "price_desc") {
    const direction = filters.sort === "price_asc" ? 1 : -1;
    products = [...products].sort((a, b) => {
      if (a.lowestPriceUSD === null && b.lowestPriceUSD === null) return 0;
      if (a.lowestPriceUSD === null) return 1;
      if (b.lowestPriceUSD === null) return -1;
      return (a.lowestPriceUSD - b.lowestPriceUSD) * direction;
    });
  }

  const total = count ?? 0;

  return {
    products,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}
