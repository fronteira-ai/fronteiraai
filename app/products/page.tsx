import { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Pagination from "@/components/ui/Pagination";
import ProductFilters from "@/components/product/ProductFilters";
import ProductGrid from "@/components/product/ProductGrid";
import ProductGridSkeleton from "@/components/product/ProductGridSkeleton";
import {
  getProductsCatalog,
  ProductCatalogFilters,
  ProductCatalogSort,
} from "@/services/product.service";
import { getCategories, getCategoryBySlug } from "@/services/category.service";
import { getBrands, getBrandBySlug } from "@/services/brand.service";
import { getStores } from "@/services/store.service";
import { productsPath, productsUrl, productUrl, ProductsQueryParams } from "@/constants/routes";

type SearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  brand?: string | string[];
  store?: string | string[];
  minPrice?: string | string[];
  maxPrice?: string | string[];
  availability?: string | string[];
  sort?: string | string[];
  page?: string | string[];
}>;

interface ResolvedParams {
  q: string;
  category: string;
  brand: string;
  store: string;
  minPrice: string;
  maxPrice: string;
  availability: string;
  sort: string;
  page: string;
}

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function resolveParams(searchParams: SearchParams): Promise<ResolvedParams> {
  const raw = await searchParams;
  return {
    q: firstValue(raw.q),
    category: firstValue(raw.category),
    brand: firstValue(raw.brand),
    store: firstValue(raw.store),
    minPrice: firstValue(raw.minPrice),
    maxPrice: firstValue(raw.maxPrice),
    availability: firstValue(raw.availability),
    sort: firstValue(raw.sort),
    page: firstValue(raw.page),
  };
}

function parsePositiveInt(value: string): number | undefined {
  const parsed = Number(value);
  return value && Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : undefined;
}

function toRawParams(params: ResolvedParams): ProductsQueryParams {
  return {
    q: params.q || undefined,
    category: params.category || undefined,
    brand: params.brand || undefined,
    store: params.store || undefined,
    minPrice: params.minPrice || undefined,
    maxPrice: params.maxPrice || undefined,
    availability: params.availability || undefined,
    sort: params.sort || undefined,
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await resolveParams(searchParams);

  const [category, brand] = await Promise.all([
    params.category ? getCategoryBySlug(params.category) : null,
    params.brand ? getBrandBySlug(params.brand) : null,
  ]);

  const titleParts = [
    params.q ? `"${params.q}"` : null,
    category?.name ?? null,
    brand?.name ?? null,
  ].filter((part): part is string => Boolean(part));

  const title =
    titleParts.length > 0
      ? `${titleParts.join(" · ")} | Produtos`
      : "Catálogo de produtos";

  const description =
    titleParts.length > 0
      ? `Compare preços de ${titleParts.join(" · ")} entre as melhores lojas do Paraguai com o ParaguAI.`
      : "Explore o catálogo completo do ParaguAI: compare preços de milhares de produtos entre as melhores lojas do Paraguai.";

  const rawParams = toRawParams(params);
  const url = productsUrl(rawParams);
  const hasFilters = Object.values(rawParams).some(Boolean) || parsePositiveInt(params.page);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "ParaguAI",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    // Combinações de filtro/página são navegação em faceta (conteúdo
    // fino/duplicado): noindex,follow — mesmo padrão de robots de /search.
    // O catálogo sem filtros (/products) continua indexável.
    robots: hasFilters ? { index: false, follow: true } : { index: true, follow: true },
  };
}

async function ProductCatalogAsync({
  filters,
  rawParams,
}: {
  filters: ProductCatalogFilters;
  rawParams: ProductsQueryParams;
}) {
  const result = await getProductsCatalog(filters);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Catálogo de produtos | ParaguAI",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: result.products.map((product, index) => ({
        "@type": "ListItem",
        position: (result.page - 1) * result.perPage + index + 1,
        url: productUrl(product.slug),
        name: product.name,
        image: product.image_url ?? undefined,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <p className="text-sm text-slate-500">
        {result.total} {result.total === 1 ? "produto encontrado" : "produtos encontrados"}
      </p>

      <div className="mt-6">
        <ProductGrid products={result.products} />
      </div>

      <div className="mt-10">
        <Pagination
          currentPage={result.page}
          totalPages={result.totalPages}
          buildHref={(page) =>
            productsPath({ ...rawParams, page: page > 1 ? String(page) : undefined })
          }
        />
      </div>
    </>
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await resolveParams(searchParams);
  const rawParams = toRawParams(params);

  const filters: ProductCatalogFilters = {
    categorySlug: params.category || undefined,
    brandSlug: params.brand || undefined,
    storeSlug: params.store || undefined,
    search: params.q || undefined,
    onlyInStock: params.availability === "in_stock" || undefined,
    minPriceUSD: params.minPrice ? Number(params.minPrice) : undefined,
    maxPriceUSD: params.maxPrice ? Number(params.maxPrice) : undefined,
    sort: (params.sort as ProductCatalogSort) || undefined,
    page: parsePositiveInt(params.page),
  };

  const [categories, brands, stores] = await Promise.all([
    getCategories(),
    getBrands(),
    getStores(),
  ]);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-6 pt-32 pb-24">
        <Breadcrumb items={[{ label: "Produtos" }]} />

        <h1 className="mt-6 text-5xl font-black">Catálogo de Produtos</h1>

        <p className="mt-4 max-w-2xl text-slate-400">
          Compare preços de milhares de produtos entre as melhores lojas do
          Paraguai.
        </p>

        <div className="mt-10">
          <ProductFilters categories={categories} brands={brands} stores={stores} />
        </div>

        <div className="mt-10">
          <Suspense fallback={<ProductGridSkeleton />}>
            <ProductCatalogAsync filters={filters} rawParams={rawParams} />
          </Suspense>
        </div>
      </div>

      <Footer />
    </main>
  );
}
