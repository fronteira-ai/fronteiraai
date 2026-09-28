"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";

const menu = [
  { name: "Início", href: "/" },
  { name: "Produtos", href: "/products" },
  { name: "Lojas", href: "/lojas" },
  { name: "Buscar", href: "/search" },
  { name: "Para Lojistas", href: "/para-lojistas" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  // Mission 03B (PHASE 1) — menu mobile. Estado local; nenhum contexto,
  // provider ou dependência nova. A navegação desktop permanece intacta.
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 8);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Mission 03B (PHASE 1) — acessibilidade do disclosure: Escape fecha. O
  // listener só existe enquanto o menu está aberto.
  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  return (
    <header
      className={`fixed top-0 left-0 z-50 w-full border-b backdrop-blur-xl transition-all duration-500 ease-out ${
        scrolled
          ? "border-white/10 bg-[#050816]/80 shadow-lg shadow-black/20"
          : "border-transparent bg-[#050816]/30"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6 lg:px-10">
        <Link href="/" className="flex items-center transition-transform duration-300 hover:scale-[1.02]">
          <Logo size="md" />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {menu.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="relative text-sm font-medium text-slate-300 transition-colors duration-300 hover:text-white after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-blue-500 after:transition-all after:duration-300 hover:after:w-full"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/search"
            aria-label="Buscar"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition-all duration-300 hover:border-blue-500 hover:text-white hover:scale-105"
          >
            <Search size={18} />
          </Link>

          <Button href="/merchant/login" variant="primary" className="hidden sm:inline-flex">
            Entrar
          </Button>

          {/* Mission 03B (PHASE 1) — gatilho do menu mobile, visível apenas
              abaixo de `lg` (onde a navegação desktop fica oculta). Nome
              acessível reflete o estado + `aria-expanded`/`aria-controls`. */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition-all duration-300 hover:border-blue-500 hover:text-white hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 lg:hidden"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mission 03B (PHASE 1) — painel do menu mobile: exatamente as MESMAS
          entradas da navegação desktop, na mesma ordem e com os mesmos hrefs.
          Nenhuma rota inventada (por isso `/categorias` não entra aqui: ele
          não faz parte da navegação desktop). Fecha ao tocar em um destino. */}
      {menuOpen ? (
        <nav
          id="mobile-navigation"
          aria-label="Navegação principal"
          className="border-t border-white/10 bg-[#050816]/95 px-6 pb-5 pt-2 backdrop-blur-xl lg:hidden"
        >
          <ul className="flex flex-col">
            {menu.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 text-sm font-medium text-slate-300 transition-colors duration-300 hover:text-white"
                >
                  {item.name}
                </Link>
              </li>
            ))}
            {/* Paridade funcional: "Entrar" é `hidden sm:inline-flex`, então em
                telas estreitas ele não aparece no header — o menu é o único
                caminho para a área do lojista. */}
            <li className="pt-3 sm:hidden">
              <Button href="/merchant/login" variant="primary" className="w-full">
                Entrar
              </Button>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
