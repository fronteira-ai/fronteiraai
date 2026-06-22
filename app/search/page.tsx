import { cache, Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SearchBar from "@/components/home/SearchBar";
import SearchResults from "@/components/search/SearchResults";
import SearchResultsSkeleton from "@/components/search/SearchResultsSkeleton";
import { searchEverything } from "@/services/search.service";
import { searchUrl } from "@/constants/routes";

type SearchParams = Promise<{ q?: string | string[] }>;

// cache() evita que generateMetadata e a página façam a mesma consulta ao
// Supabase duas vezes dentro da mesma requisição (mesmo padrão de
// app/product/[slug]/layout.tsx).
const getCachedSearch = cache(searchEverything);

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const q = firstValue((await searchParams).q);

  const title = q ? `Busca por "${q}"` : "Pesquisar produtos, lojas e marcas";
  const description = q
    ? `Resultados da busca por "${q}" no ParaguAI: produtos, lojas, marcas e categorias.`
    : "Pesquise produtos, lojas, marcas e categorias no ParaguAI e compare preços no Paraguai.";
  const url = searchUrl(q || undefined);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "ParaguAI",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    // Resultados de busca (?q=) são conteúdo fino/duplicado e não devem ser
    // indexados; a página de busca em si (sem query) pode ser indexada.
    robots: q
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}

async function SearchResultsAsync({ query }: { query: string }) {
  const results = await getCachedSearch(query);
  return <SearchResults results={results} />;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = firstValue((await searchParams).q);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 pt-32">
        <h1 className="text-5xl font-black">Pesquisa Inteligente</h1>

        <p className="mt-4 max-w-2xl text-slate-400">
          Pesquise produtos, lojas, marcas e categorias utilizando a IA do ParaguAI.
        </p>

        <SearchBar defaultValue={q} />
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <Suspense fallback={<SearchResultsSkeleton />}>
          <SearchResultsAsync query={q} />
        </Suspense>
      </section>

      <Footer />
    </main>
  );
}
