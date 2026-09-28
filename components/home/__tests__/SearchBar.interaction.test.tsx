/**
 * Mission 02A — Home Search Instrumentation. Prova comportamental do
 * componente REAL (`components/home/SearchBar`), em jsdom, com o pipeline de
 * analytics mockado (o `track()` real já tem seus próprios testes).
 *
 * O que aqui se prova é o contrato exigido pela missão:
 * - submissão válida ⇒ 1 evento `SearchSubmitted`, source=home, query
 *   normalizada, e a navegação continua ocorrendo;
 * - submissão vazia ⇒ NÃO navega, 1 evento com `has_query:false`, sem
 *   `search_query` (nunca uma busca válida), foco no input + `aria-invalid`;
 * - nunca `SearchPerformed` (esse é o page view de /search);
 * - sem duplicação.
 * @jest-environment jsdom
 */
import { act } from "react";
import type { ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AnalyticsEventType } from "@/src/domains/merchant-analytics/types/enums";

// SearchBar → useSearch → constants/routes → lib/env: define as env
// obrigatórias antes do import dinâmico no beforeAll (env.ts lança se
// ausentes), mesmo padrão de utils/__tests__/useSearch.interaction.test.tsx.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// React 19 exige que o ambiente declare suporte a act(); sem isto, cada
// setState do componente emite um console.error (o teste passa, mas o output
// fica poluído). Só afeta ESTE arquivo — o teste de interação pré-existente
// (utils/__tests__/useSearch.interaction.test.tsx) não é alterado.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const pushMock = jest.fn();
const mockTrack = jest.fn();

// ts-jest não hoista jest.mock — por isso o import do componente é dinâmico
// no beforeAll, depois destes registros.
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/hooks/useAnalytics", () => ({
  useAnalytics: () => ({ track: mockTrack }),
}));

type SearchBarProps = { defaultValue?: string; suggestions?: string[] };
type TrackedEvent = { search_query?: string; metadata: Record<string, unknown> };

let SearchBar: ComponentType<SearchBarProps>;

beforeAll(async () => {
  const mod = await import("@/components/home/SearchBar");
  SearchBar = mod.default;
});

describe("SearchBar — submissão de busca (M02A)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    pushMock.mockClear();
    mockTrack.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(props: SearchBarProps = {}) {
    act(() => {
      root.render(<SearchBar {...props} />);
    });
  }

  function input(): HTMLInputElement {
    return container.querySelector("input")!;
  }

  /** O botão de submissão é o primeiro <button>; os chips de sugestão vêm
   * depois dele no DOM. */
  function buttons(): HTMLButtonElement[] {
    return Array.from(container.querySelectorAll("button"));
  }

  function setInputValue(value: string) {
    const el = input();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  function lastTracked(): { type: AnalyticsEventType; payload: TrackedEvent } {
    const calls = mockTrack.mock.calls as Array<[AnalyticsEventType, TrackedEvent]>;
    const [type, payload] = calls[calls.length - 1];
    return { type, payload };
  }

  it("submissão válida: 1 evento SearchSubmitted, source=home, has_query=true e navega", () => {
    render();
    setInputValue("  Notebook Gamer  ");
    act(() => {
      buttons()[0].click();
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    const { type, payload } = lastTracked();
    expect(type).toBe(AnalyticsEventType.SearchSubmitted);
    expect(type).not.toBe(AnalyticsEventType.SearchPerformed);
    expect(payload.search_query).toBe("Notebook Gamer");
    expect(payload.metadata).toEqual({
      action: "search_submit",
      source: "home",
      has_query: true,
    });

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/search?q=Notebook%20Gamer");
  });

  it("submissão vazia: NÃO navega e emite 1 evento com has_query=false, sem search_query", () => {
    render();
    act(() => {
      buttons()[0].click();
    });

    expect(pushMock).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledTimes(1);

    const { type, payload } = lastTracked();
    expect(type).toBe(AnalyticsEventType.SearchSubmitted);
    expect(payload.search_query).toBeUndefined();
    expect(payload.metadata).toEqual({
      action: "search_submit",
      source: "home",
      has_query: false,
    });
  });

  it("submissão vazia: foca o input e expõe aria-invalid; o atributo some ao digitar", () => {
    render();
    // Estado inicial idêntico ao HTML renderizado no servidor: sem atributo.
    expect(input().hasAttribute("aria-invalid")).toBe(false);

    act(() => {
      buttons()[0].click();
    });
    expect(document.activeElement).toBe(input());
    expect(input().getAttribute("aria-invalid")).toBe("true");

    setInputValue("t");
    expect(input().hasAttribute("aria-invalid")).toBe(false);
    // Digitar não emite evento algum.
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it("chip de sugestão: 1 toque = 1 evento + 1 navegação", () => {
    render({ suggestions: ["iphone 17 pro", "ps5"] });
    const all = buttons();
    // all[0] = botão de submeter; all[1] = primeiro chip.
    act(() => {
      all[1].click();
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    const { payload } = lastTracked();
    expect(payload.search_query).toBe("iphone 17 pro");
    expect(payload.metadata.source).toBe("home");
    expect(pushMock).toHaveBeenCalledWith("/search?q=iphone%2017%20pro");
  });

  it("Enter emite uma única vez (não duplica com o clique do botão)", () => {
    render();
    setInputValue("tv 4k");
    act(() => {
      input().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  it("Enter com campo vazio: 1 evento, sem navegação (mesmo caminho do botão)", () => {
    render();
    act(() => {
      input().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(lastTracked().payload.metadata.has_query).toBe(false);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
