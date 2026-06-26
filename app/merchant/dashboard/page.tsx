"use client";
import { useState, useEffect } from "react";
import { MerchantSidebar } from "@/components/merchant/layout/MerchantSidebar";
import { StatsGrid } from "@/components/merchant/dashboard/StatsGrid";
import { ScoreCard } from "@/components/merchant/dashboard/ScoreCard";
import { RecommendationsPanel } from "@/components/merchant/dashboard/RecommendationsPanel";
import { NextStepCard } from "@/components/merchant/dashboard/NextStepCard";
import { GoalsPanel } from "@/components/merchant/dashboard/GoalsPanel";
import type {
  MerchantDashboardStats,
  MerchantScoreBreakdown,
  MerchantRecommendation,
  MerchantLevel,
  NextStep,
  MerchantGoal,
} from "@/types/merchant";
import { RefreshCw } from "lucide-react";

interface DashboardData {
  stats: MerchantDashboardStats;
  scoreBreakdown: MerchantScoreBreakdown;
  level: MerchantLevel;
  nextStep: NextStep;
  goals: MerchantGoal[];
  recommendations: MerchantRecommendation[];
  merchant: {
    company_name: string;
    plan: string;
    status: string;
    onboarding_done: boolean;
    verified_level: string;
  };
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function relativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 2) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)} dia${Math.floor(hours / 24) > 1 ? "s" : ""}`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-28 bg-slate-800 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-slate-800 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-64 bg-slate-800 rounded-xl" />
        <div className="h-64 bg-slate-800 rounded-xl" />
      </div>
    </div>
  );
}

export default function MerchantDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/merchant/dashboard/stats")
      .then(async (r) => {
        if (r.status === 401 || r.status === 403 || r.status === 404) {
          await fetch("/api/merchant/auth/register", { method: "POST" });
          return fetch("/api/merchant/dashboard/stats");
        }
        return r;
      })
      .then((r) => r.json() as Promise<{ data: DashboardData }>)
      .then((json) => {
        if (json.data) { setData(json.data); }
        else { setError(true); }
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
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

  const name = data?.merchant.company_name;
  const lastSync = data?.stats.lastImportAt;

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <MerchantSidebar companyName={name} plan={data?.merchant.plan} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-white">
                {greeting()}{name ? `, ${name}` : ""}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {lastSync
                  ? <>Última sincronização <span className="text-slate-400">{relativeTime(lastSync)}</span></>
                  : "Sua loja ainda não tem produtos. Vamos mudar isso?"}
              </p>
            </div>
            <button
              onClick={() => { setLoading(true); setError(false); setRefreshKey((k) => k + 1); }}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-lg transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>

          {loading ? (
            <DashboardSkeleton />
          ) : error ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <p className="text-slate-400 text-sm mb-3">Não foi possível carregar os dados.</p>
              <button
                onClick={() => { setLoading(true); setError(false); setRefreshKey((k) => k + 1); }}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Tentar novamente →
              </button>
            </div>
          ) : data ? (
            <div className="space-y-5">

              {/* Próximo passo — always at top */}
              <NextStepCard nextStep={data.nextStep} />

              {/* Stats */}
              <StatsGrid stats={data.stats} />

              {/* Score + Goals */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ScoreCard score={data.scoreBreakdown} level={data.level} />
                <GoalsPanel goals={data.goals} />
              </div>

              {/* Growth Insights */}
              <RecommendationsPanel
                recommendations={data.recommendations}
                onDismiss={dismissRec}
              />

            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
