import Navbar from "@/components/layout/Navbar";
import SearchBar from "@/components/home/SearchBar";
import SearchResults from "@/components/search/SearchResults";

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">

      <Navbar />

      <section className="mx-auto max-w-7xl px-6 pt-32">

        <h1 className="text-5xl font-black">
          Pesquisa Inteligente
        </h1>

        <p className="mt-4 max-w-2xl text-slate-400">
          Pesquise produtos, lojas, marcas e categorias utilizando a IA do ParaguAI.
        </p>

        <SearchBar />

      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">

        <SearchResults />

      </section>

    </main>
  );
}