"use client";
import { useState, useEffect } from "react";
import { MerchantSidebar } from "@/components/merchant/layout/MerchantSidebar";
import { StatsGrid } from "@/components/merchant/dashboard/StatsGrid";
import { ScoreCard } from "@/components/merchant/dashboard/ScoreCard";
import { RecommendationsPanel } from "@/components/merchant/dashboard/RecommendationsPanel";
import type { MerchantDashboardStats, MerchantScoreBreakdown, MerchantRecommendation } from "@/types/merchant";
import { RefreshCw, TrendingUp } from "lucide-react";

interface DashboardData {
  stats: MerchantDashboardStats;
  scoreBreakdown: MerchantScoreBreakdown;
  recommendations: MerchantRecommendation[];
  merchant: { company_name: string; plan: string; status: string; onboarding_done: boolean; verified_level: string };
}

function relativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 2) return "agora";
  if (minutes < 60) return `há ${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} hora${hours > 1 ? "s" : ""}`;
  return `há ${Math.floor(hours / 24)} dia${Math.floor(hours / 24) > 1 ? "s" : ""}`;
}

export default function MerchantDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/merchant/dashboard/stats")
      .then((r) => r.json() as Promise<{ data: DashboardData }>)
      .then((json) => { setData(json.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  async function dismissRec(id: string) {
    await fetch("/api/merchant/recommendations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setData((prev) => prev ? {
      ...prev,
      recommendations: prev.recommendations.filter((r) => r.id !== id),
    } : prev);
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <MerchantSidebar companyName={data?.merchant.company_name} plan={data?.merchant.plan} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-white">
                {data?.merchant.company_name ? `Olá, ${data.merchant.company_name}` : "Dashboard"}
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Última sincronização:{" "}
                {data?.stats.lastImportAt ? relativeTime(data.stats.lastImportAt) : "Nunca"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {data?.merchant.onboarding_done === false && (
                <a href="/merchant/onboarding" className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 text-sm rounded-lg border border-emerald-600/30 hover:bg-emerald-600/30 transition-colors">
                  <TrendingUp className="w-4 h-4" />
                  Concluir configuração
                </a>
              )}
              <button
                onClick={() => { setLoading(true); setRefreshKey((k) => k + 1); }}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
              {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-slate-800 rounded-xl" />)}
            </div>
          ) : data ? (
            <div className="space-y-6">
              <StatsGrid stats={data.stats} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ScoreCard score={data.scoreBreakdown} />
                <RecommendationsPanel recommendations={data.recommendations} onDismiss={dismissRec} />
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-white mb-3">Ações rápidas</h2>
                <div className="flex flex-wrap gap-3">
                  <a href="/merchant/imports/new" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors">
                    Nova importação
                  </a>
                  <a href="/merchant/products" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors">
                    Ver produtos
                  </a>
                  <a href="/merchant/settings" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors">
                    Configurações
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Erro ao carregar dados. Tente novamente.</p>
          )}
        </div>
      </main>
    </div>
  );
}
