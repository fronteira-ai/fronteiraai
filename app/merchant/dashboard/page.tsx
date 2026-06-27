"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { MerchantSidebar } from "@/components/merchant/layout/MerchantSidebar";
import { StatsGrid } from "@/components/merchant/dashboard/StatsGrid";
import { ScoreCard } from "@/components/merchant/dashboard/ScoreCard";
import { RecommendationsPanel } from "@/components/merchant/dashboard/RecommendationsPanel";
import { NextStepCard } from "@/components/merchant/dashboard/NextStepCard";
import { GoalsPanel } from "@/components/merchant/dashboard/GoalsPanel";
import { MerchantProgressCard } from "@/components/merchant/dashboard/MerchantProgressCard";
import type {
  MerchantDashboardStats,
  MerchantScoreBreakdown,
  MerchantRecommendation,
  MerchantLevel,
  NextStep,
  MerchantGoal,
  MerchantProfileCompletion,
} from "@/types/merchant";
import { RefreshCw, Upload, Clock, AlertCircle, Settings } from "lucide-react";

interface DashboardData {
  stats: MerchantDashboardStats;
  scoreBreakdown: MerchantScoreBreakdown;
  level: MerchantLevel;
  nextStep: NextStep;
  goals: MerchantGoal[];
  profileCompletion: MerchantProfileCompletion;
  recommendations: MerchantRecommendation[];
  merchant: {
    id: string;
    company_name: string;
    plan: string;
    status: string;
    onboarding_done: boolean;
    verified_level: string;
  };
}

type ErrorKind = "auth" | "not_found" | "server" | "network" | null;

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

function ErrorState({ kind, message, onRetry }: { kind: ErrorKind; message: string; onRetry: () => void }) {
  if (kind === "not_found") {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <Settings className="w-6 h-6 text-amber-400" />
        </div>
        <h3 className="text-white font-semibold mb-2">Configuração incompleta</h3>
        <p className="text-slate-400 text-sm mb-5">
          Não encontramos um perfil de lojista vinculado à sua conta.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/merchant/register" className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">
            Finalizar configuração
          </Link>
          <button onClick={onRetry} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-6 h-6 text-red-400" />
      </div>
      <h3 className="text-white font-semibold mb-2">
        {kind === "network" ? "Sem conexão" : "Erro ao carregar dados"}
      </h3>
      <p className="text-slate-400 text-sm mb-1">
        {kind === "network"
          ? "Verifique sua conexão e tente novamente."
          : "Ocorreu um erro ao buscar os dados da sua loja."}
      </p>
      {kind === "server" && (
        <p className="text-slate-600 text-xs font-mono mb-4">{message}</p>
      )}
      <button
        onClick={onRetry}
        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
      >
        Tentar novamente →
      </button>
    </div>
  );
}

function WelcomeBanner({ companyName }: { companyName: string }) {
  return (
    <div className="bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/30 rounded-xl p-6 mb-5">
      <p className="text-2xl mb-2">🎉</p>
      <h2 className="text-lg font-bold text-white mb-1">
        Bem-vindo ao ParaguAI{companyName ? `, ${companyName}` : ""}!
      </h2>
      <p className="text-slate-400 text-sm mb-4 leading-relaxed">
        Sua loja foi criada com sucesso. Agora vamos publicar seus primeiros produtos e você começa a aparecer para os compradores.
      </p>
      <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-5">
        <Clock className="w-3.5 h-3.5" />
        Tempo estimado: 2 minutos
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/merchant/imports/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Upload className="w-4 h-4" />
          Importar produtos
        </Link>
        <Link
          href="/merchant/onboarding"
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
        >
          Conhecer o Merchant OS
        </Link>
      </div>
    </div>
  );
}

export default function MerchantDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // First attempt
        let res = await fetch("/api/merchant/dashboard/stats");

        // Auto-recover: no merchant record yet → create it, then retry once
        if (res.status === 401) {
          if (!cancelled) { setErrorKind("auth"); setErrorMsg("Sessão expirada"); setLoading(false); }
          return;
        }
        if (res.status === 403 || res.status === 404) {
          const reg = await fetch("/api/merchant/auth/register", { method: "POST" });
          if (!reg.ok) {
            const regBody = await reg.json().catch(() => ({})) as { error?: string };
            console.error("[dashboard] register failed:", regBody.error ?? reg.status);
          }
          res = await fetch("/api/merchant/dashboard/stats");
        }

        const json = await res.json() as { data?: DashboardData; error?: string };

        if (!cancelled) {
          if (json.data) {
            setData(json.data);
            setErrorKind(null);
          } else {
            const errMsg = json.error ?? "Erro desconhecido";
            console.error("[dashboard] stats error:", errMsg, "status:", res.status);
            setErrorKind(res.status === 403 || res.status === 404 ? "not_found" : "server");
            setErrorMsg(errMsg);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Erro de rede";
          console.error("[dashboard] fetch error:", msg);
          setErrorKind("network");
          setErrorMsg(msg);
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  function handleRefresh() {
    setLoading(true);
    setErrorKind(null);
    setErrorMsg("");
    setRefreshKey((k) => k + 1);
  }

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
  const isFirstAccess = data ? !data.merchant.onboarding_done : false;

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
                {loading
                  ? "Carregando..."
                  : lastSync
                    ? <>Última sincronização <span className="text-slate-400">{relativeTime(lastSync)}</span></>
                    : "Sua loja ainda não tem produtos. Vamos mudar isso?"}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-lg transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>

          {loading ? (
            <DashboardSkeleton />
          ) : errorKind ? (
            <ErrorState kind={errorKind} message={errorMsg} onRetry={handleRefresh} />
          ) : data ? (
            <div>
              {/* Welcome banner for first-time users */}
              {isFirstAccess && <WelcomeBanner companyName={name ?? ""} />}

              <div className="space-y-5">
                {/* Próximo passo */}
                <NextStepCard nextStep={data.nextStep} />

                {/* Stats */}
                <StatsGrid stats={data.stats} />

                {/* Score + Goals + Progress */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <ScoreCard score={data.scoreBreakdown} level={data.level} />
                  <GoalsPanel goals={data.goals} />
                  <MerchantProgressCard completion={data.profileCompletion} />
                </div>

                {/* Growth Insights */}
                <RecommendationsPanel
                  recommendations={data.recommendations}
                  onDismiss={dismissRec}
                />
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
