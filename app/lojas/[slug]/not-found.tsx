import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

export default function LojaNotFound() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
        <p className="text-6xl font-black text-slate-800 mb-4">404</p>
        <h1 className="text-2xl font-bold text-white mb-2">Loja não encontrada</h1>
        <p className="text-slate-500 text-sm mb-8 max-w-sm">
          Esta loja não existe ou foi removida do catálogo do ParaguAI.
        </p>
        <div className="flex gap-3">
          <Link
            href="/lojas"
            className="rounded-full bg-blue-600 hover:bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            Ver todas as lojas
          </Link>
          <Link
            href="/"
            className="rounded-full border border-slate-700 px-6 py-2.5 text-sm font-semibold text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            Início
          </Link>
        </div>
      </div>
    </main>
  );
}
