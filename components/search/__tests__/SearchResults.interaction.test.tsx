/**
 * Mission 03B (PHASE 4) — o resumo público da busca não expõe mais a latência
 * interna (`durationMs`), que continua no contrato de `SearchResponse`.
 * @jest-environment jsdom
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SearchResponse } from "@/types/search";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// Import DINÂMICO: `SearchResults` → `constants/routes` → `lib/env`, que lança
// se as env vars não estiverem definidas. Um import estático seria avaliado
// antes das atribuições acima (mesmo padrão dos outros testes de interação).
let SearchResults: typeof import("@/components/search/SearchResults").default;

beforeAll(async () => {
  const mod = await import("@/components/search/SearchResults");
  SearchResults = mod.default;
});

function response(over: Partial<SearchResponse> = {}): SearchResponse {
  return {
    query: "notebook",
    products: [],
    stores: [],
    brands: [],
    categories: [],
    total: 3,
    durationMs: 42,
    ...over,
  };
}

describe("Mission 03B — resumo da busca", () => {
  it("renderiza contagem e termo, e NÃO renderiza a latência interna", () => {
    const html = renderToStaticMarkup(createElement(SearchResults, { results: response() }));

    expect(html).toContain("3");
    expect(html).toContain("resultados para");
    expect(html).toContain("notebook");

    // O ponto da missão: nenhuma menção a milissegundos no HTML público.
    expect(html).not.toMatch(/\d+\s*ms/i);
    expect(html).not.toContain("42ms");
  });

  it("singular correto e sem latência", () => {
    const html = renderToStaticMarkup(
      createElement(SearchResults, { results: response({ total: 1, durationMs: 987 }) })
    );

    expect(html).toContain("1 resultado para");
    expect(html).not.toMatch(/\d+\s*ms/i);
    expect(html).not.toContain("987");
  });

  it("latência ausente/zero não altera o resumo", () => {
    const html = renderToStaticMarkup(
      createElement(SearchResults, { results: response({ durationMs: 0 }) })
    );

    expect(html).toContain("resultados para");
    expect(html).not.toMatch(/\d+\s*ms/i);
  });
});
