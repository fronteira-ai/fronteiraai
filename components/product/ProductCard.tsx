import { memo } from "react";
import Link from "next/link";
import { Product } from "@/types/product";
import { formatUSD } from "@/utils/currency";

type Props = {
  product: Product;
  lowestPriceUSD?: number;
};

function ProductCard({ product, lowestPriceUSD }: Props) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 transition-all duration-300 hover:-translate-y-2 hover:border-blue-500"
    >

      <div className="flex aspect-square w-full items-center justify-center overflow-hidden bg-slate-950">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-slate-600">Sem imagem</span>
        )}
      </div>

      <div className="p-6">

        <h3 className="line-clamp-2 text-lg font-bold text-white">
          {product.name}
        </h3>

        {lowestPriceUSD !== undefined ? (
          <p className="mt-3 text-2xl font-black text-blue-400">
            {formatUSD(lowestPriceUSD)}
          </p>
        ) : null}

      </div>

    </Link>
  );
}

export default memo(ProductCard);
