import { Search, SearchX } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import StoreCard from "@/components/store/StoreCard";
import CategoryCard from "@/components/ui/CategoryCard";
import Chip from "@/components/ui/Chip";
import EmptyState from "@/components/ui/EmptyState";
import { SearchResponse } from "@/types/search";
import type { SearchIntelligenceBadge } from "@/src/domains/buyer-intelligence";

type Props = {
  results: SearchResponse;
  belowAveragePriceBadges?: Map<string, SearchIntelligenceBadge>;
};

export default function SearchResults({ results, belowAveragePriceBadges }: Props) {
  const { query, products, stores, brands, categories, total, durationMs } = results;

  if (!query) {
    return (
      <EmptyState
        icon={Search}
        title="Digite algo para pesquisar"
        description="Busque por produtos, lojas, marcas ou categorias do ParaguAI."
      />
    );
  }

  if (total === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={`Nenhum resultado para "${query}"`}
        description="Tente outro termo, verifique a ortografia ou pesquise por uma categoria."
      />
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <p className="text-sm text-slate-500">
        {total} {total === 1 ? "resultado" : "resultados"} para &ldquo;{query}&rdquo;
        {durationMs > 0 ? ` · ${durationMs}ms` : ""}
      </p>

      {products.length > 0 ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
          <h2 className="text-2xl font-bold text-white">
            Produtos ({products.length})
          </h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                slug={product.slug}
                name={product.name}
                imageUrl={product.image_url}
                priceUSD={product.lowestPriceUSD ?? undefined}
                inStock={product.inStock}
                belowAveragePrice={belowAveragePriceBadges?.get(product.id)?.belowAveragePrice}
                isBestDeal={belowAveragePriceBadges?.get(product.id)?.isBestDeal}
              />
            ))}
          </div>
        </section>
      ) : null}

      {stores.length > 0 ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
          <h2 className="text-2xl font-bold text-white">
            Lojas ({stores.length})
          </h2>

          <div className="mt-6 grid gap-8 lg:grid-cols-3">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        </section>
      ) : null}

      {categories.length > 0 ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
          <h2 className="text-2xl font-bold text-white">
            Categorias ({categories.length})
          </h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                icon={category.icon ?? "🛍️"}
                name={category.name}
                href={`/categories/${category.slug}`}
              />
            ))}
          </div>
        </section>
      ) : null}

      {brands.length > 0 ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
          <h2 className="text-2xl font-bold text-white">
            Marcas ({brands.length})
          </h2>

          <div className="mt-6 flex flex-wrap gap-3">
            {brands.map((brand) => (
              <Chip key={brand.id}>{brand.name}</Chip>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
