"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { searchPath } from "@/constants/routes";

interface UseSearchResult {
  query: string;
  setQuery: (value: string) => void;
  /** Sprint 39B: aceita valor opcional — chips de sugestão passam o termo
   * diretamente; sem argumento usa o valor atual do campo. */
  submit: (value?: string) => void;
}

// Estado de input + navegação para a busca. A busca em si (consulta ao
// Supabase) acontece no servidor em app/search/page.tsx via
// services/search.service.ts — este hook só governa a experiência do
// campo de busca e mantém a URL (?q=) como fonte de verdade, para que o
// resultado continue compartilhável e funcione sem JavaScript no cliente.
export function useSearch(initialQuery = ""): UseSearchResult {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  // Sprint 39B (Search as the Hero): aceita um valor opcional para que chips
  // de sugestões possam disparar a busca diretamente (1 toque) sem depender
  // do estado assíncrono de setQuery.
  const submit = useCallback(
    (value?: string) => {
      const trimmed = (value ?? query).trim();
      if (!trimmed) return;
      router.push(searchPath(trimmed));
    },
    [query, router]
  );

  return { query, setQuery, submit };
}
