/**
 * Mission 03B (PHASE 1) — navegação mobile do Navbar.
 * @jest-environment jsdom
 */
import { act, createElement } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// React 19 exige que o ambiente declare suporte a act() (só afeta este arquivo).
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// `next/link` renderiza um <a> real — o suficiente para provar destinos/hrefs.
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: ReactNode } & Record<string, unknown>) =>
    createElement("a", { href, ...rest }, children),
}));

type NavbarComponent = () => ReactNode;
let Navbar: NavbarComponent;

beforeAll(async () => {
  const mod = await import("@/components/layout/Navbar");
  Navbar = mod.default as unknown as NavbarComponent;
});

/** Destinos canônicos da navegação desktop — a paridade é a exigência. */
const CANONICAL = ["/", "/products", "/lojas", "/search", "/para-lojistas"];

describe("Mission 03B — Navbar: navegação mobile", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render() {
    act(() => {
      root.render(createElement(Navbar));
    });
  }

  function trigger(): HTMLButtonElement {
    const button = container.querySelector("button[aria-controls='mobile-navigation']");
    if (!button) throw new Error("gatilho do menu mobile não encontrado");
    return button as HTMLButtonElement;
  }

  it("existe um gatilho com nome acessível e aponta para o painel", () => {
    render();

    const button = trigger();
    expect(button.getAttribute("aria-label")).toBe("Abrir menu");
    expect(button.getAttribute("aria-controls")).toBe("mobile-navigation");
    expect(button.tagName).toBe("BUTTON");
  });

  it("o menu abre e expõe exatamente os destinos canônicos da navegação desktop", () => {
    render();

    expect(container.querySelector("#mobile-navigation")).toBeNull();

    act(() => {
      trigger().click();
    });

    const panel = container.querySelector("#mobile-navigation");
    expect(panel).not.toBeNull();

    for (const href of CANONICAL) {
      expect(panel!.querySelector(`a[href="${href}"]`)).not.toBeNull();
    }
    // Exatamente os 5 destinos canônicos, na mesma ordem, mais o acesso de
    // lojista ("Entrar") — no header ele é `hidden sm:inline-flex`, então o
    // painel é o único caminho em telas estreitas (paridade funcional).
    expect(
      Array.from(panel!.querySelectorAll("a")).map((a) => a.getAttribute("href"))
    ).toEqual([...CANONICAL, "/merchant/login"]);
  });

  it("os hrefs são os canônicos e não há duplicação fora do esperado", () => {
    render();
    act(() => {
      trigger().click();
    });

    const panel = container.querySelector("#mobile-navigation")!;
    const panelHrefs = Array.from(panel.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(panelHrefs).toEqual([...CANONICAL, "/merchant/login"]);

    // Com o menu aberto cada destino aparece 2× DENTRO DE <nav> (desktop +
    // mobile). O link do logo (`/`) não conta: ele não vive em um <nav>.
    const navLinks = Array.from(container.querySelectorAll("nav a")).map((a) => a.getAttribute("href"));
    for (const href of CANONICAL) {
      expect(navLinks.filter((h) => h === href)).toHaveLength(2);
    }
  });

  it("aria-expanded reflete o estado e o nome acessível muda", () => {
    render();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(trigger().getAttribute("aria-label")).toBe("Abrir menu");

    act(() => {
      trigger().click();
    });

    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(trigger().getAttribute("aria-label")).toBe("Fechar menu");
  });

  it("Escape fecha o menu", () => {
    render();
    act(() => {
      trigger().click();
    });
    expect(container.querySelector("#mobile-navigation")).not.toBeNull();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(container.querySelector("#mobile-navigation")).toBeNull();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("clicar em um destino fecha o menu e preserva o href de navegação", () => {
    render();
    act(() => {
      trigger().click();
    });

    const panel = container.querySelector("#mobile-navigation")!;
    const target = panel.querySelector("a[href='/produtos']") ?? panel.querySelector("a[href='/products']");
    expect(target).not.toBeNull();

    act(() => {
      (target as HTMLAnchorElement).click();
    });

    expect(container.querySelector("#mobile-navigation")).toBeNull();
    expect((target as HTMLAnchorElement).getAttribute("href")).toBe("/products");
  });

  it("a navegação desktop continua representada quando o menu está fechado", () => {
    render();

    // O `<nav>` desktop é sempre renderizado (`hidden … lg:flex`), com os 5
    // destinos — a implementação mobile não o substitui.
    const desktopNav = container.querySelector("nav.hidden");
    expect(desktopNav).not.toBeNull();
    expect(desktopNav!.querySelectorAll("a")).toHaveLength(5);

    for (const href of CANONICAL) {
      expect(desktopNav!.querySelector(`a[href="${href}"]`)).not.toBeNull();
    }
  });

  it("o comportamento de autenticação (`Entrar`) permanece", () => {
    render();
    const headerLogin = container.querySelector("a[href='/merchant/login']");
    expect(headerLogin).not.toBeNull();

    act(() => {
      trigger().click();
    });

    const panel = container.querySelector("#mobile-navigation")!;
    expect(panel.querySelector("a[href='/merchant/login']")).not.toBeNull();
  });
});
