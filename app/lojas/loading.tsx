import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Mission 03B (PHASE 3) — estado de carregamento de rota para /lojas,
// ausente até aqui. Mesmo padrão de app/products/loading.tsx (Navbar + Footer
// + skeleton) e mesma linguagem visual da página: cabeçalho centralizado e
// grid de cards de loja. Nenhuma lógica da página é alterada.
export default function Loading() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      <div className="mx-auto max-w-6xl animate-pulse px-6 pt-32">
        <div className="mx-auto mb-12 flex flex-col items-center">
          <div className="h-7 w-40 rounded-full bg-slate-800" />
          <div className="mt-5 h-12 w-80 rounded bg-slate-800" />
          <div className="mt-4 h-4 w-full max-w-xl rounded bg-slate-800" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
              <div className="h-28 bg-slate-800" />
              <div className="p-4">
                <div className="h-5 w-40 rounded bg-slate-800" />
                <div className="mt-2 h-3 w-24 rounded-full bg-slate-800" />
                <div className="mt-3 h-3 w-full rounded-full bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <div className="h-40 w-full rounded-2xl bg-slate-900" />
      </div>

      <Footer />
    </main>
  );
}
