import { memo } from "react";
import { PackageSearch } from "lucide-react";
import { ProductCatalogItem } from "@/types/product";
import ProductCard from "@/components/product/ProductCard";
import EmptyState from "@/components/ui/EmptyState";

type Props = {
  products: ProductCatalogItem[];
};

function ProductGrid({ products }: Props) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="Nenhum produto encontrado"
        description="Tente ajustar os filtros, ampliar a faixa de preço ou pesquisar por outro termo."
      />
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          slug={product.slug}
          name={product.name}
          imageUrl={product.image_url}
          priceUSD={product.lowestPriceUSD ?? undefined}
          subtitle={product.brand?.name}
          inStock={product.lowestPriceUSD !== null ? product.inStock : undefined}
        />
      ))}
    </div>
  );
}

export default memo(ProductGrid);
