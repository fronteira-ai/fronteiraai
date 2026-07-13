import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatUSD, discountPercentage } from "@/utils/currency";
import { productPath } from "@/constants/routes";
import { animations } from "@/styles/animations";

type Props = {
  slug: string;
  name: string;
  imageUrl: string | null;
  priceUSD?: number;
  originalPriceUSD?: number;
  subtitle?: string;
  inStock?: boolean;
  /** Release 2.0 — Wave 1 ("Preço Abaixo da Média"), PriceIntelligenceService
   * via SearchIntelligenceComposer — a compact signal for grid contexts. */
  belowAveragePrice?: boolean;
};

function ProductCard({
  slug,
  name,
  imageUrl,
  priceUSD,
  originalPriceUSD,
  subtitle,
  inStock,
  belowAveragePrice,
}: Props) {
  const discount =
    originalPriceUSD && priceUSD
      ? discountPercentage(originalPriceUSD, priceUSD)
      : 0;

  return (
    <Link
      href={productPath(slug)}
      className={`group flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 ${animations.cardHover}`}
    >
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-slate-950">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-slate-600">Sem imagem</span>
        )}

        {discount > 0 ? (
          <span className="absolute left-4 top-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
            -{discount}%
          </span>
        ) : null}

        {inStock === false ? (
          <span className="absolute right-4 top-4 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
            Esgotado
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="line-clamp-2 text-lg font-bold text-white">{name}</h3>

        {subtitle ? (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        ) : null}

        {priceUSD !== undefined ? (
          <>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                {formatUSD(priceUSD)}
              </span>

              {originalPriceUSD ? (
                <span className="text-sm text-slate-500 line-through">
                  {formatUSD(originalPriceUSD)}
                </span>
              ) : null}
            </div>

            {belowAveragePrice ? (
              <span className="mt-1 inline-block w-fit rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                Preço abaixo da média
              </span>
            ) : null}
          </>
        ) : null}

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

export default memo(ProductCard);
