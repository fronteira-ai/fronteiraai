"use client";

import { useEffect, useRef } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { AnalyticsEventType } from "@/src/domains/merchant-analytics/types/enums";
import { zeroResultsDecision } from "@/utils/buyerEvents";

type Props = {
  /** Termo buscado (já trimado pela página). Vazio = página em branco, não
   * é um zero-result. */
  query: string;
  /** `results.total` — este tracker só é montado pela página quando é 0. */
  resultCount: number;
};

/**
 * Mission 01 (C1). Ilha invisível em `/search` que registra UM único
 * `SearchZeroResults` por visualização relevante de busca sem resultado.
 *
 * A decisão (emitir? qual chave?) vive em `utils/buyerEvents.ts` e é testada
 * lá, sem DOM. Aqui `lastKeyRef` é a memória entre renders: um re-render com
 * a mesma (query, total) não reemite; mudar a query (ou navegar de novo para
 * o mesmo termo, o que remonta o componente) emite de novo.
 *
 * `metadata.result_count` é explícito (0) — a linha em `buyer_events` fica
 * autoexplicativa sem depender de join com `search_query`.
 */
export default function SearchZeroResultsTracker({ query, resultCount }: Props) {
  const { track } = useAnalytics();
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const decision = zeroResultsDecision(query, resultCount, lastKeyRef.current);
    if (!decision.emit) return;

    lastKeyRef.current = decision.key;
    track(AnalyticsEventType.SearchZeroResults, {
      search_query: query.trim(),
      metadata: { result_count: resultCount, action: "search_zero_results" },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, resultCount]);

  return null;
}
