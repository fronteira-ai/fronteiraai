import { memo } from "react";
import { Product } from "@/types/product";
import ProductCard from "@/components/product/ProductCard";

type Props = {
  products: Product[];
};

function RelatedProducts({ products }: Props) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">

      <h2 className="text-2xl font-bold text-white">
        Produtos relacionados
      </h2>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            slug={product.slug}
            name={product.name}
            imageUrl={product.image_url}
          />
        ))}
      </div>

    </section>
  );
}

export default memo(RelatedProducts);
