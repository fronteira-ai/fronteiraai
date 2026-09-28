"use client";

import Link from "next/link";
import Chip from "@/components/ui/Chip";
import { useSearch } from "@/hooks/useSearch";
import { productsPath } from "@/constants/routes";

type Props = {
  /** Termos REAIS (agregação de `buyer_events.SearchPerformed` via
   * services/search-suggestions.service.ts). Vazio ⇒ nenhum chip é
   * renderizado — nunca fabricamos um termo para preencher a tela. */
  suggestions: string[];
};

/**
 * Mission 01 (D). Recuperação a partir de uma busca sem resultado.
 *
 * Antes: `EmptyState` sem ação — o usuário só podia reescrever o termo.
 * Agora: chips de buscas REAIS (1 toque refaz a busca, mesmo componente
 * `Chip` que a Home já usa) e um CTA para o catálogo completo. Sem
 * sugestões, o CTA continua sendo exibido sozinho.
 *
 * Nada aqui é hardcoded: a lista vem do servidor (a página resolve). O
 * `useSearch` reusa exatamente o caminho de busca do `SearchBar`.
 */
export default function ZeroResultRecovery({ suggestions }: Props) {
  const { submit } = useSearch("");

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6">
      {suggestions.length > 0 ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tente uma destas buscas
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {suggestions.map((term) => (
              <Chip key={term} className="py-3" onClick={() => submit(term)}>
                {term}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      <Link
        href={productsPath()}
        className="rounded-full bg-gradient-to-r from-brand-blue to-brand-purple px-6 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:scale-[1.03] active:scale-95"
      >
        Explorar todos os produtos
      </Link>
    </div>
  );
}
