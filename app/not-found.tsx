import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
        <p className="text-7xl font-black text-blue-500">404</p>

        <h1 className="mt-6 text-3xl font-bold text-white">
          Página não encontrada
        </h1>

        <p className="mt-4 text-slate-400">
          A página que você procura não existe ou foi movida. Tente navegar
          pelo catálogo ou fazer uma busca.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="rounded-full bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-500"
          >
            Ir para o início
          </Link>
          <Link
            href="/products"
            className="rounded-full border border-slate-700 px-8 py-3 font-semibold text-slate-200 transition hover:border-blue-500 hover:text-white"
          >
            Ver catálogo
          </Link>
          <Link
            href="/search"
            className="rounded-full border border-slate-700 px-8 py-3 font-semibold text-slate-200 transition hover:border-blue-500 hover:text-white"
          >
            Buscar
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}
