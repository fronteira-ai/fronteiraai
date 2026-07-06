import type { Metadata } from "next";
import Link from "next/link";
import { Search, Package, Layers } from "lucide-react";
import { SITE_URL, productsPath } from "@/constants/routes";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Reveal from "@/components/ui/Reveal";
import Pagination from "@/components/ui/Pagination";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getAllCategoriesWithCounts, type CategoryWithCount } from "@/lib/home-premium-service";

export const metadata: Metadata = {
  title: "Categorias — Explore o catálogo completo",
  description:
    "Todas as categorias de produtos disponíveis no ParaguAI, com contagem real de produtos e ofertas por categoria.",
  alternates: { canonical: `${SITE_URL}/categorias` },
  openGraph: {
    title: "Categorias | ParaguAI",
    description: "Explore todas as categorias de produtos disponíveis no ParaguAI.",
    url: `${SITE_URL}/categorias`,
    siteName: "ParaguAI",
    type: "website",
    locale: "pt_BR",
  },
};

type SearchParams = Promise<{ q?: string; sort?: string; page?: string }>;

type SortKey = "popularidade" | "nome" | "ofertas";

const PAGE_SIZE = 24;

function sortCategories(categories: CategoryWithCount[], sort: SortKey): CategoryWithCount[] {
  const sorted = [...categories];
  if (sort === "nome") return sorted.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  if (sort === "ofertas") return sorted.sort((a, b) => b.offerCount - a.offerCount);
  return sorted; // already sorted by productCount desc ("popularidade") from the facade
}

function buildHref(q: string, sort: string, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (sort && sort !== "popularidade") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/categorias?${query}` : "/categorias";
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "popularidade", label: "Mais produtos" },
  { key: "ofertas", label: "Mais ofertas" },
  { key: "nome", label: "Nome (A-Z)" },
];

export default async function CategoriasPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = "", sort = "popularidade", page = "1" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const sortKey: SortKey = sort === "nome" || sort === "ofertas" ? sort : "popularidade";

  const client = getSupabaseServiceClient();
  const all = await getAllCategoriesWithCounts(client);

  const filtered = q ? all.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : all;
  const sorted = sortCategories(filtered, sortKey);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 pt-32 pb-24">
        <Reveal direction="up">
          <div className="mb-10 text-center">
            <span className="mb-5 inline-block rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[2px] text-blue-400">
              Catálogo completo
            </span>
            <h1 className="text-4xl font-black text-white sm:text-5xl">Categorias</h1>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Explore todas as categorias de produtos disponíveis no Paraguai.
            </p>
          </div>
        </Reveal>

        <Reveal direction="up" delay={80}>
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <form method="get" className="relative w-full max-w-md">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Buscar categoria..."
                aria-label="Buscar categoria"
                className="w-full rounded-full border border-slate-700 bg-slate-900/70 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500/60"
              />
              {sortKey !== "popularidade" ? <input type="hidden" name="sort" value={sortKey} /> : null}
            </form>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Ordenar categorias">
              {SORT_OPTIONS.map((option) => (
                <Link
                  key={option.key}
                  href={buildHref(q, option.key, 1)}
                  aria-current={sortKey === option.key ? "true" : undefined}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    sortKey === option.key
                      ? "border-blue-500 bg-blue-500/15 text-blue-300"
                      : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                  }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>
        </Reveal>

        {pageItems.length === 0 ? (
          <div className="py-20 text-center text-slate-500">Nenhuma categoria encontrada para &quot;{q}&quot;.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pageItems.map((category, i) => (
              <Reveal key={category.id} direction="up" delay={i * 40}>
                <Link
                  href={productsPath({ category: category.slug })}
                  className="group flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/50 hover:bg-slate-900"
                >
                  <div className="text-4xl transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110">
                    {category.icon ?? "🛍️"}
                  </div>
                  <h2 className="font-bold text-white">{category.name}</h2>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Package size={12} />
                      {category.productCount.toLocaleString("pt-BR")} produtos
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers size={12} />
                      {category.offerCount.toLocaleString("pt-BR")} ofertas
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}

        <div className="mt-12">
          <Pagination currentPage={currentPage} totalPages={totalPages} buildHref={(p) => buildHref(q, sortKey, p)} />
        </div>
      </div>

      <Footer />
    </main>
  );
}
