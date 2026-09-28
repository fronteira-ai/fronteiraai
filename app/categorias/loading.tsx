import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// Mission 03B (PHASE 4) — estado de carregamento de rota para /categorias,
// ausente até aqui. Mesmo padrão de app/products/loading.tsx e mesma estrutura
// da página (cabeçalho centralizado, campo de busca, chips de ordenação e grid
// de categorias). A página em si está congelada e NÃO foi alterada — isto é
// apenas resiliência funcional de rota.
export default function Loading() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      <div className="mx-auto max-w-6xl animate-pulse px-6 pt-32">
        <div className="mb-10 flex flex-col items-center">
          <div className="h-7 w-40 rounded-full bg-slate-800" />
          <div className="mt-5 h-12 w-64 rounded bg-slate-800" />
          <div className="mt-4 h-4 w-full max-w-md rounded bg-slate-800" />
        </div>

        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-12 w-full max-w-md rounded-full bg-slate-900" />
          <div className="flex gap-2">
            <div className="h-9 w-32 rounded-full bg-slate-900" />
            <div className="h-9 w-28 rounded-full bg-slate-900" />
            <div className="h-9 w-28 rounded-full bg-slate-900" />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 rounded-3xl border border-slate-800 bg-slate-900/60" />
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}
