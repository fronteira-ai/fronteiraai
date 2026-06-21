import { memo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductHighlight } from "@/types/product";
import { formatUSD, discountPercentage } from "@/utils/currency";
import { animations } from "@/styles/animations";

type Props = {
  product: ProductHighlight;
};

function ProductHighlightCard({ product }: Props) {
  const discount = product.originalPriceUSD
    ? discountPercentage(product.originalPriceUSD, product.priceUSD)
    : 0;

  return (
    <Link
      href={`/product/${product.slug}`}
      className={`group flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 ${animations.cardHover}`}
    >
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-slate-950">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-slate-600">Sem imagem</span>
        )}

        {discount > 0 ? (
          <span className="absolute left-4 top-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
            -{discount}%
          </span>
        ) : null}

        {!product.inStock ? (
          <span className="absolute right-4 top-4 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
            Esgotado
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="line-clamp-2 text-lg font-bold text-white">
          {product.name}
        </h3>

        <p className="mt-1 text-sm text-slate-500">{product.storeName}</p>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl font-black text-white">
            {formatUSD(product.priceUSD)}
          </span>

          {product.originalPriceUSD ? (
            <span className="text-sm text-slate-500 line-through">
              {formatUSD(product.originalPriceUSD)}
            </span>
          ) : null}
        </div>

        <span className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-700 py-2.5 text-sm font-semibold text-slate-200 transition-all duration-300 group-hover:border-blue-500 group-hover:text-white">
          Ver Produto
          <ArrowRight
            size={14}
            className="-translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
          />
        </span>
      </div>
    </Link>
  );
}

export default memo(ProductHighlightCard);
