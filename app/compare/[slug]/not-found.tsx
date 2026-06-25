import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      <div className="mx-auto max-w-3xl px-6 pt-40 pb-24 text-center">

        <h1 className="text-3xl font-bold text-white">
          Produto não encontrado
        </h1>

        <p className="mt-4 text-slate-400">
          Não encontramos este produto para comparar. Pesquise outro produto ou
          explore o nosso catálogo.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/products"
            className="rounded-full border border-slate-700 px-6 py-3 font-semibold text-slate-300 transition hover:border-blue-500 hover:text-white"
          >
            Ver catálogo
          </Link>

          <Link
            href="/search"
            className="rounded-full bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500"
          >
            Pesquisar produtos
          </Link>
        </div>

      </div>

      <Footer />
    </main>
  );
}
