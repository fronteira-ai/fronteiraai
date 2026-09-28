"use client";

import { useEffect, useRef } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { AnalyticsEventType } from "@/src/domains/merchant-analytics/types/enums";
import { compareViewMetadata } from "@/utils/buyerEvents";

type Props = {
  productId: string;
  offerCount: number;
  storeCount: number;
};

/**
 * Mission 01 (C3). Ilha invisível em `/compare/[slug]` que registra a
 * visualização da comparação.
 *
 * Usa `ProductCompared` — que já existia no enum (com mapeamento semântico
 * em `src/domains/trust/events/event-registry.ts`: "comparação revela
 * intenção avançada de compra") e estava sem nenhum call site. Nenhum
 * tracker genérico de page view é criado, conforme o escopo da missão.
 *
 * Dedup idêntico ao SearchViewTracker: uma emissão por (produto, ofertas,
 * lojas) observada neste componente montado — o `useRef` sobrevive a
 * re-render e à dupla invocação de efeito do StrictMode, e muda de chave
 * quando a página navega para outro produto.
 */
export default function CompareViewTracker({ productId, offerCount, storeCount }: Props) {
  const { track } = useAnalytics();
  const firedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${productId}|${offerCount}|${storeCount}`;
    if (firedKeyRef.current === key) return;
    firedKeyRef.current = key;

    track(AnalyticsEventType.ProductCompared, {
      product_id: productId,
      metadata: compareViewMetadata(offerCount, storeCount),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, offerCount, storeCount]);

  return null;
}
