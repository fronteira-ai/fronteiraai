/**
 * Sprint 39B — interação de busca (search submit / suggestion click).
 * @jest-environment jsdom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

// useSearch → constants/routes → lib/env: define as env obrigatórias antes
// do import dinâmico no beforeAll (env.ts lança se ausentes).
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Import dinâmico no beforeAll: com ts-jest o jest.mock não é hoisted — o mock
// de next/navigation acima precisa estar registrado antes do hook ser
// importado (import estático no topo rodaria antes do mock).
let useSearch: (initialQuery?: string) => {
  query: string;
  setQuery: (value: string) => void;
  submit: (value?: string) => void;
};

beforeAll(async () => {
  const hook = await import("@/hooks/useSearch");
  useSearch = hook.useSearch;
});

function Harness({ initial = "" }: { initial?: string }) {
  const { query, setQuery, submit } = useSearch(initial);
  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="busca" />
      {/* chip → submit(override): 1 toque dispara a busca */}
      <button onClick={() => submit("iPhone 17 Pro")}>chip-sugestao</button>
      {/* botão/Enter → submit() sem override: usa o valor do input */}
      <button onClick={() => submit()}>enviar</button>
    </div>
  );
}

describe("useSearch (search submit / suggestion click)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    pushMock.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(initial = "") {
    act(() => {
      root.render(<Harness initial={initial} />);
    });
  }

  function setInputValue(value: string) {
    const input = container.querySelector("input")!;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  it("submit() sem override navega com o valor digitado (botão/Enter)", () => {
    render();
    setInputValue("Notebook Gamer");
    act(() => {
      container.querySelectorAll("button")[1].click();
    });
    expect(pushMock).toHaveBeenCalledWith("/search?q=Notebook%20Gamer");
  });

  it("submit(override) do chip dispara a busca direto (suggestion click)", () => {
    render();
    act(() => {
      container.querySelectorAll("button")[0].click();
    });
    expect(pushMock).toHaveBeenCalledWith("/search?q=iPhone%2017%20Pro");
  });

  it("submit ignora valor vazio (não navega)", () => {
    render("   ");
    act(() => {
      container.querySelectorAll("button")[1].click();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
