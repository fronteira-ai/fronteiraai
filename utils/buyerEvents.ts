// FUNIL DO COMPRADOR — decisões puras de instrumentação (Mission 01, C).
//
// Por que este módulo existe: o pipeline real de eventos é o que já existe
// (`hooks/useAnalytics` → `buyer_events` → `/api/analytics/events` →
// `eventPlatform`). O que faltava era DECIDIR quando emitir e com que
// payload — e essa decisão precisa ser testável sem DOM (este repositório não
// tem @testing-library). Cada ilha "use client" abaixo é um adaptador fino
// sobre estas funções, e é aqui que o comportamento é provado por teste.
//
// Nada aqui cria framework novo, provider novo ou tabela nova: são funções
// puras que devolvem tipo + metadados para o `track()` que já existe.

import { AnalyticsEventType } from "@/src/domains/merchant-analytics/types/enums";

/**
 * Distinção explícita entre "viu a página do produto" e "clicou no produto a
 * partir de uma lista". `ProductClicked` já é emitido por
 * `components/product/ProductViewTracker.tsx` como PAGE VIEW e tem 3
 * consumidores reais que contam por `event_type` (FunnelService passo
 * "Produto clicado"; MerchantAnalyticsService `clicks++`; OpportunityEngine
 * popularidade) — por isso ela NÃO é reutilizada aqui: misturar view e clique
 * no mesmo tipo tornaria os três impossíveis de interpretar. O menor evento
 * aditivo necessário é `ProductClickedFromList`, e os dois lados carregam
 * `action` explícito para que qualquer leitor futuro não precise adivinhar.
 */
export const PRODUCT_ACTION_VIEW = "product_view";
export const PRODUCT_ACTION_CLICK = "product_click";

/** Superfícies que podem originar um clique em produto (grid/vitrine). */
export type ProductListSource = "home" | "search" | "catalog" | "related" | "store";

export function productViewMetadata(): Record<string, unknown> {
  return { action: PRODUCT_ACTION_VIEW };
}

export function productListClickMetadata(
  source: ProductListSource,
  position: number
): Record<string, unknown> {
  return { action: PRODUCT_ACTION_CLICK, source, position };
}

/** O tipo do evento de clique em lista — sempre distinto do de view. */
export const PRODUCT_LIST_CLICK_EVENT = AnalyticsEventType.ProductClickedFromList;
export const PRODUCT_VIEW_EVENT = AnalyticsEventType.ProductClicked;

/**
 * Compare — metadados de visualização. `ProductCompared` já existia no enum
 * (nenhum call site até aqui) e descreve exatamente "o comprador comparou
 * este produto entre lojas"; nenhum tracker genérico de page view é criado.
 */
export function compareViewMetadata(offerCount: number, storeCount: number): Record<string, unknown> {
  return { action: "compare_view", offers: offerCount, stores: storeCount };
}

/**
 * Compare — o `item_id` do clique de saída é o SLUG REAL do produto
 * (nunca string vazia: um id vazio é uma atribuição perdida, não um dado).
 */
export function outboundOfferItemId(productSlug: string): string {
  return productSlug.trim();
}

/**
 * Zero results — decisão de emissão com proteção de duplicação.
 *
 * Regra: emite UMA vez por "visualização relevante", ou seja, por par
 * (query, total) observado neste componente montado. Re-render com o mesmo
 * par não reemite; uma nova query (ou uma nova navegação para a mesma query)
 * reemite. `lastKey` é o valor que o chamador guarda entre renders (um
 * `useRef`), e `key` é o que ele deve persistir.
 *
 * Só emite com `total === 0` E query não vazia: `/search` sem termo não é um
 * zero-result, é uma página em branco.
 */
export interface ZeroResultsDecision {
  emit: boolean;
  key: string | null;
}

export function zeroResultsDecision(
  query: string,
  total: number,
  lastKey: string | null
): ZeroResultsDecision {
  const normalized = query.trim();
  if (!normalized) return { emit: false, key: lastKey };
  if (total !== 0) return { emit: false, key: lastKey };

  const key = `${normalized}|${total}`;
  if (lastKey === key) return { emit: false, key: lastKey };
  return { emit: true, key };
}

// ── Submissão de busca (Mission 02A — Home Search Instrumentation) ───────────

/**
 * O evento canônico de SUBMISSÃO de busca. `SearchPerformed` NÃO é
 * reutilizado: ele é o PAGE VIEW de /search (SearchViewTracker) e tem
 * consumidores que contam por `event_type` (FunnelService passo "Busca
 * realizada", agregação de sugestões, observabilidade). Submeter a busca (na
 * Home) e VER a página de resultado (/search) são passos distintos do funil —
 * por isso `SearchSubmitted` é aditivo, e o ponto de interação emite APENAS
 * ele. Nunca há dupla contagem com o SearchViewTracker.
 */
export const SEARCH_SUBMITTED_EVENT = AnalyticsEventType.SearchSubmitted;

/** Superfícies que SUBMETEM uma busca. Hoje só a Home emite: `/search` é a
 * página de resultado (SearchPerformed), não um ponto de submissão. */
export type SearchSubmitSource = "home";

export const SEARCH_ACTION_SUBMIT = "search_submit";

/** Payload do evento de submissão, já no formato que `track()` espera. */
export interface SearchSubmitEvent {
  event_type: typeof SEARCH_SUBMITTED_EVENT;
  search_query?: string;
  metadata: Record<string, unknown>;
}

export interface SearchSubmitDecision {
  /** true ⟺ navegar para `/search?q=…`. Comportamento PRÉ-EXISTENTE
   * (qualquer termo não vazio, após trim) — M02A não o altera. */
  navigate: boolean;
  /** Termo normalizado (trim) — o MESMO valor usado na navegação. */
  query: string;
  /** O evento a emitir — exatamente um por submissão. */
  event: SearchSubmitEvent;
}

export function searchSubmitMetadata(
  source: SearchSubmitSource,
  hasQuery: boolean
): Record<string, unknown> {
  return { action: SEARCH_ACTION_SUBMIT, source, has_query: hasQuery };
}

/**
 * Decisão pura de submissão de busca. Emite exatamente UM evento por
 * submissão — inclusive quando o termo é vazio — para que o clique em
 * "Encontrar a melhor compra" com o campo vazio deixe de ser uma interação
 * invisível (Mission 02A, §4).
 *
 * - termo válido → `navigate: true`,  `has_query: true`,  `search_query` presente
 * - termo vazio  → `navigate: false`, `has_query: false`, SEM `search_query`
 *
 * `has_query` é o discriminante do contrato: qualquer métrica de "buscas
 * válidas" deve filtrar `has_query = true`. Uma submissão vazia nunca é
 * contada como busca válida (nem naviga, nem carrega `search_query`), mas
 * passa a ser medível — que é o objetivo de §4.
 */
export function searchSubmitDecision(
  raw: string,
  source: SearchSubmitSource = "home"
): SearchSubmitDecision {
  const query = raw.trim();
  const hasQuery = query.length > 0;

  return {
    navigate: hasQuery,
    query,
    event: {
      event_type: SEARCH_SUBMITTED_EVENT,
      ...(hasQuery ? { search_query: query } : {}),
      metadata: searchSubmitMetadata(source, hasQuery),
    },
  };
}
