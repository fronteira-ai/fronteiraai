import { memo } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { formatUSD } from "@/src/domains/exchange";
import { discountPercentage } from "@/utils/currency";
import { resolveProductImage } from "@/utils/image";
import { animations } from "@/styles/animations";
import ProductLink from "@/components/product/ProductLink";
import type { ProductListSource } from "@/utils/buyerEvents";

type Props = {
  slug: string;
  /** Mission 01 (C2) — id real do produto, quando o chamador tem (todos os
   * grids têm). Vai como `product_id` no evento de clique. */
  productId?: string;
  /** Mission 01 (C2) — superfície de origem do clique (Home, busca,
   * catálogo, relacionados, loja) e posição 1-based na lista. Opcionais: um
   * chamador que não passe nada continua com o mesmo DOM — o único efeito é
   * o metadado do evento. */
  source?: ProductListSource;
  position?: number;
  name: string;
  imageUrl: string | null;
  priceUSD?: number;
  originalPriceUSD?: number;
  subtitle?: string;
  inStock?: boolean;
  /** Release 2.0 — Wave 1 ("Preço Abaixo da Média"), PriceIntelligenceService
   * via SearchIntelligenceComposer — a compact signal for grid contexts. */
  belowAveragePrice?: boolean;
  /** Release 2.0 — Wave 2 ("🏆 Melhor Compra"), same SearchIntelligenceComposer
   * call — takes priority over belowAveragePrice when both are true. */
  isBestDeal?: boolean;
  /** Release 2.0 — Wave 4 (Trust Experience), TrustComposer.composeCompactForStores
   * — compact "🛡️ Verificada" pill for the store selling this product in a
   * results grid. Undefined on every existing caller (Home/catalog/related
   * products) keeps their rendered DOM identical. */
  isVerifiedStore?: boolean;
};

function ProductCard({
  slug,
  productId,
  source,
  position,
  name,
  imageUrl,
  priceUSD,
  originalPriceUSD,
  subtitle,
  inStock,
  belowAveragePrice,
  isBestDeal,
  isVerifiedStore,
}: Props) {
  const discount =
    originalPriceUSD && priceUSD
      ? discountPercentage(originalPriceUSD, priceUSD)
      : 0;
  const realImageUrl = resolveProductImage(imageUrl);

  return (
    <ProductLink
      slug={slug}
      productId={productId}
      name={name}
      source={source ?? "catalog"}
      position={position ?? 1}
      className={`group flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 ${animations.cardHover}`}
    >
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-slate-950">
        {realImageUrl ? (
          <Image
            src={realImageUrl}
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

        {isVerifiedStore ? (
          <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
            🛡️ Verificada
          </span>
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

            {isBestDeal ? (
              <span className="mt-1 inline-block w-fit rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-300">
                🏆 Melhor compra
              </span>
            ) : belowAveragePrice ? (
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
    </ProductLink>
  );
}

export default memo(ProductCard);
