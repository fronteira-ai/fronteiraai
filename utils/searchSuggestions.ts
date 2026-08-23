// Sprint 39A — Home 2.0 Foundation (Search Foundation).
//
// Ranking puro de sugestões de busca a partir de eventos reais
// (`buyer_events.event_type = 'SearchPerformed'`). Sem rede e sem banco aqui:
// a parte determinística (sanitização, deduplicação, limite, ordenação) vive
// neste módulo e é testável; a consulta fica em
// services/search-suggestions.service.ts (server-only).
//
// Política de PII: `search_query` é texto livre do usuário. Nunca expor
// consultas que pareçam URL/email/caminho; nunca expor identificadores de
// sessão/usuário (o service nem os seleciona). A agregação por contagem e o
// corte em top-N reduzem ainda mais a exposição.

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 60;
export const DEFAULT_SUGGESTION_LIMIT = 8;

export interface SearchEventRow {
  search_query: string | null;
}

/** Normaliza e valida uma consulta crua. Retorna `null` quando a consulta
 * deve ser descartada (vazia, curta demais, longa demais, URL, e-mail ou
 * caminho de arquivo). */
export function normalizeSearchQuery(raw: string): string | null {
  const query = raw.trim().replace(/\s+/g, " ");
  if (query.length < MIN_QUERY_LENGTH) return null;
  if (query.length > MAX_QUERY_LENGTH) return null;
  if (/^https?:\/\//i.test(query)) return null;
  if (/^www\./i.test(query)) return null;
  if (/\S+@\S+\.\S+/.test(query)) return null; // e-mail embutido
  if (query.includes("/") || query.includes("\\")) return null; // caminho
  return query;
}

/**
 * Agrega eventos de busca em sugestões ordenadas por frequência (desempate
 * alfabético), deduplicadas por lowercase (mantém a primeira grafia vista
 * para estabilidade de exibição), limitadas a `limit`.
 */
export function rankSearchSuggestions(
  rows: SearchEventRow[],
  limit: number = DEFAULT_SUGGESTION_LIMIT
): string[] {
  const counts = new Map<string, { count: number; display: string }>();

  for (const row of rows) {
    if (typeof row.search_query !== "string") continue;
    const normalized = normalizeSearchQuery(row.search_query);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { count: 1, display: normalized });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.display.localeCompare(b.display))
    .slice(0, limit)
    .map((entry) => entry.display);
}
