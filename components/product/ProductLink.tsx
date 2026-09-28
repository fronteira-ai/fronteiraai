"use client";

import Link from "next/link";
import { useAnalytics } from "@/hooks/useAnalytics";
import { AnalyticsEventType } from "@/src/domains/merchant-analytics/types/enums";
import { productListClickMetadata, type ProductListSource } from "@/utils/buyerEvents";
import { productPath } from "@/constants/routes";

type Props = {
  slug: string;
  /** Id real do produto, quando o chamador tem (todos os grids têm). */
  productId?: string;
  name: string;
  /** Onde o clique aconteceu — Home, busca, catálogo, relacionados, loja. */
  source: ProductListSource;
  /** Posição 1-based na lista renderizada. */
  position: number;
  className?: string;
  children: React.ReactNode;
};

/**
 * Mission 01 (C2). Ilha client mínima que envolve o `<Link>` do
 * `ProductCard` para registrar o clique em produto a partir de uma LISTA.
 *
 * Mesmo padrão já estabelecido por `OfferLink`/`StoreContactLinks`: uma
 * ilha pequena que dispara `track()` e deixa o cartão continuar Server
 * Component. Emite `ProductClickedFromList` (tipo próprio, aditivo) e não
 * `ProductClicked` — este último é o PAGE VIEW de `/product/[slug]` e já
 * tem 3 consumidores que contam por tipo (funil, analytics de lojista,
 * popularidade). Ver `utils/buyerEvents.ts` para a justificativa completa.
 */
export default function ProductLink({
  slug,
  productId,
  name,
  source,
  position,
  className,
  children,
}: Props) {
  const { track } = useAnalytics();

  return (
    <Link
      href={productPath(slug)}
      onClick={() =>
        track(AnalyticsEventType.ProductClickedFromList, {
          product_id: productId,
          metadata: { ...productListClickMetadata(source, position), slug, name },
        })
      }
      className={className}
    >
      {children}
    </Link>
  );
}
