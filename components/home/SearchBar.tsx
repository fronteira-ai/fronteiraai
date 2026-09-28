"use client";

import { useRef, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import Chip from "@/components/ui/Chip";
import { useSearch } from "@/hooks/useSearch";
import { useAnalytics } from "@/hooks/useAnalytics";
import { searchSubmitDecision, type SearchSubmitSource } from "@/utils/buyerEvents";

type Props = {
  defaultValue?: string;
  /** Sugestões reais de busca, providas pelo servidor (Sprint 39B —
   * services/search-suggestions.service.ts, eventos reais de buyer_events).
   * Vazias = sem dados → o bloco de sugestões não é renderizado (fallback
   * honesto, nunca fabricar termos). */
  suggestions?: string[];
  /** Mission 02A — superfície de origem do evento de submissão. Não afeta o
   * DOM; o único emissor hoje é a Home. */
  source?: SearchSubmitSource;
};

/**
 * Mission 02A — Home Search Instrumentation (pixel-identical).
 *
 * A ação primária da Home passa a ser medível no PONTO DE INTERAÇÃO: cada
 * submissão emite exatamente UM `SearchSubmitted` (utils/buyerEvents.ts,
 * searchSubmitDecision) — nunca `SearchPerformed`, que é o page view de
 * /search (SearchViewTracker) e o passo seguinte do funil.
 *
 * O dead-end "submit vazio retorna em silêncio" é corrigido SEM UI nova:
 * apenas foco no input + `aria-invalid` (atributo, não layout). Nenhum
 * elemento, espaçamento, tipografia, cor ou ordem muda.
 */
export default function SearchBar({ defaultValue = "", suggestions = [], source = "home" }: Props) {
  const { query, setQuery, submit } = useSearch(defaultValue);
  const { track } = useAnalytics();
  const inputRef = useRef<HTMLInputElement>(null);
  // Único estado acrescentado. `false` é o estado inicial, então o HTML
  // renderizado no servidor é byte-a-byte o mesmo de antes (aria-invalid só
  // aparece depois de uma submissão vazia) e some quando o usuário volta a
  // digitar.
  const [invalid, setInvalid] = useState(false);

  function handleSubmit(value?: string) {
    const decision = searchSubmitDecision(value ?? query, source);

    // 1 evento por submissão — válida ou vazia. `track()` já é o pipeline
    // existente (hooks/useAnalytics → buyer_events); nada é enviado direto.
    track(decision.event.event_type, {
      ...(decision.event.search_query !== undefined
        ? { search_query: decision.event.search_query }
        : {}),
      metadata: decision.event.metadata,
    });

    if (!decision.navigate) {
      // Dead-end corrigido sem UI nova: semântica a11y + foco. O feedback
      // visual permanente fica para uma missão visual aprovada pelo CTO.
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }

    if (invalid) setInvalid(false);
    submit(decision.query);
  }

  return (
    <div className="w-full">
      <div className="glass-card flex flex-col overflow-hidden rounded-3xl shadow-[0_0_60px_-20px_var(--color-brand-blue)] ring-1 ring-brand-blue/25 transition-all duration-300 sm:flex-row sm:rounded-full focus-within:ring-brand-blue/50">
        <div className="flex items-center pl-6 pt-6 sm:pt-0">
          <Search size={22} className="text-slate-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            if (invalid) setInvalid(false);
            setQuery(e.target.value);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="O que você quer comprar?"
          aria-label="Buscar produtos"
          aria-invalid={invalid ? true : undefined}
          className="flex-1 bg-transparent px-5 py-6 text-lg text-white outline-none placeholder:text-slate-500"
        />

        <button
          onClick={() => handleSubmit()}
          className="m-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-blue to-brand-purple px-8 py-4 font-semibold text-white shadow-[0_0_24px_-6px_var(--color-brand-blue)] transition-transform duration-300 hover:scale-[1.03] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/60"
        >
          <Sparkles size={18} />
          Encontrar a melhor compra
        </button>
      </div>

      {suggestions.length > 0 ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Mais buscados
          </span>
          {suggestions.map((item) => (
            <Chip
              key={item}
              className="py-3"
              onClick={() => {
                setQuery(item);
                handleSubmit(item);
              }}
            >
              {item}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}
