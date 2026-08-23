// Sprint 39A — Home 2.0 Foundation (Freshness Model).
//
// Classificação de idade de dados para o frontend, desacoplada de qualquer
// visual: o helper devolve um nível; a decisão de como renderizar ("Atualizado
// em DD/MM", badge discreto, omitir) pertence ao componente, nunca a este
// módulo.
//
// Decisão documentada: NÃO reutilizamos `src/domains/realtime-commerce/
// freshness/FreshnessService.ts`. Aquele serviço mede frescor de *mudanças de
// mercado* (janelas por changeType, agregações por domínio) e vive num domínio
// de backend que a Home não deve acoplar. Aqui o requisito é uma classificação
// pura, determinística e testável de um timestamp qualquer — sem rede, sem
// banco, sem domínio.

export type FreshnessLevel = "FRESH" | "AGING" | "STALE" | "UNKNOWN";

export interface FreshnessRules {
  /** Idade máxima (ms) para classificar como FRESH. */
  freshMaxAgeMs: number;
  /** A partir desta idade (ms) o dado é STALE; entre `freshMaxAgeMs` e
   * `staleAfterMs` é AGING. `staleAfterMs` deve ser >= `freshMaxAgeMs`. */
  staleAfterMs: number;
}

// Declarativo e configurável: as páginas podem passar regras próprias sem
// mudar este módulo. Padrão: FRESH até 6h, AGING até 72h, depois STALE.
export const DEFAULT_FRESHNESS_RULES: FreshnessRules = {
  freshMaxAgeMs: 6 * 60 * 60 * 1000,
  staleAfterMs: 72 * 60 * 60 * 1000,
};

/**
 * Idade do dado em ms a partir de `now`. Retorna `null` para timestamps
 * ausentes ou inválidos (não confundir "sem dado" com "dado velho").
 * Timestamps futuros são tratados como idade 0 (FRESH), nunca negativos.
 */
export function dataAgeMs(
  timestamp: string | number | Date | null | undefined,
  now: number = Date.now()
): number | null {
  if (timestamp === null || timestamp === undefined) return null;

  let timeMs: number;
  if (timestamp instanceof Date) {
    timeMs = timestamp.getTime();
  } else if (typeof timestamp === "number") {
    timeMs = timestamp;
  } else {
    timeMs = new Date(timestamp).getTime();
  }

  if (Number.isNaN(timeMs)) return null;
  return Math.max(0, now - timeMs);
}

/**
 * Classifica a idade de um timestamp em FRESH | AGING | STALE | UNKNOWN.
 * Sem timestamp válido → UNKNOWN (o dado existe, mas a idade é desconhecida —
 * nunca inventar frescor, ver Freshness Policy na doc da 39A).
 */
export function classifyFreshness(
  timestamp: string | number | Date | null | undefined,
  rules: FreshnessRules = DEFAULT_FRESHNESS_RULES,
  now: number = Date.now()
): FreshnessLevel {
  const age = dataAgeMs(timestamp, now);
  if (age === null) return "UNKNOWN";
  if (age <= rules.freshMaxAgeMs) return "FRESH";
  if (age <= rules.staleAfterMs) return "AGING";
  return "STALE";
}
