"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";

const menu = [
  { name: "Início", href: "/" },
  { name: "Produtos", href: "/products" },
  { name: "Buscar", href: "/search" },
  { name: "IA", href: "/#ia" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 8);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 z-50 w-full border-b backdrop-blur-xl transition-all duration-500 ease-out ${
        scrolled
          ? "border-white/10 bg-[#050816]/80 shadow-lg shadow-black/20"
          : "border-transparent bg-[#050816]/30"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
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

          <Button variant="primary" className="hidden sm:inline-flex">
            Entrar
          </Button>
        </div>
      </div>
    </header>
  );
}
