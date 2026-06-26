"use client";
import { MerchantSidebar } from "@/components/merchant/layout/MerchantSidebar";
import { BarChart2 } from "lucide-react";

export default function MerchantAnalyticsPage() {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <MerchantSidebar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white">Analytics</h1>
            <p className="text-slate-400 text-sm mt-0.5">Métricas de desempenho do seu catálogo</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BarChart2 className="w-7 h-7 text-slate-500" />
            </div>
            <h2 className="text-white font-semibold mb-2">Analytics em breve</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              Visualizações, cliques, CTR e histórico de crescimento do catálogo estarão disponíveis em breve.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-left max-w-lg mx-auto opacity-40 pointer-events-none">
              {["Visualizações", "Cliques", "CTR"].map((m) => (
                <div key={m} className="bg-slate-800 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">{m}</p>
                  <p className="text-white font-bold text-xl mt-1">—</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
