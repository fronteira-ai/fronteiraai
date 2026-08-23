// Sprint 39A — Home 2.0 Foundation (Search Foundation — sugestões reais).
//
// Fonte READ-ONLY de sugestões de busca a partir de eventos reais
// (buyer_events.event_type = 'SearchPerformed'). Server-only: usa o client de
// service role (mesmo precedente de services/stores-public.service.ts) porque
// buyer_events é tabela de analytics sem leitura anônima.
//
// Requisitos da 39A atendidos aqui:
// - deduplicação, sanitização, limite e fallback → utils/searchSuggestions.ts
// - sem PII → a query seleciona APENAS `search_query`; nunca anonymous_id,
//   buyer_id, session_id, page_url ou metadata;
// - sem dependência de buyer identity → agregação global, sem filtro por
//   usuário/sessão;
// - cache apropriado → a página que consumir (39B) decide a estratégia (ISR/
//   revalidate); este método é puramente a leitura.
//
// Fallback: em erro de banco retorna [] — o chamador decide exibir a lista
// estática atual ou nada (nunca fabricar sugestão).

import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  DEFAULT_SUGGESTION_LIMIT,
  rankSearchSuggestions,
  type SearchEventRow,
} from "@/utils/searchSuggestions";

/** Limite defensivo de linhas varridas — com ~2.6k eventos hoje e top-N na
 * casa de 8, 10k cobre folga sem custo relevante (índice
 * idx_buyer_events_search em (event_type, occurred_at DESC)). */
const MAX_EVENTS_SCANNED = 10_000;

export async function getPopularSearchSuggestions(
  limit: number = DEFAULT_SUGGESTION_LIMIT
): Promise<string[]> {
  const client = getSupabaseServiceClient();

  const { data, error } = await client
    .from("buyer_events")
    .select("search_query")
    .eq("event_type", "SearchPerformed")
    .not("search_query", "is", null)
    .order("occurred_at", { ascending: false })
    .limit(MAX_EVENTS_SCANNED);

  if (error) {
    console.error("[search-suggestions] buyer_events query failed:", error.message);
    return [];
  }

  return rankSearchSuggestions((data ?? []) as SearchEventRow[], limit);
}
