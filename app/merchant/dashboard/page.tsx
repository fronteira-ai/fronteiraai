"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MerchantSidebar } from "@/components/merchant/layout/MerchantSidebar";
import { StatsGrid } from "@/components/merchant/dashboard/StatsGrid";
import { ScoreCard } from "@/components/merchant/dashboard/ScoreCard";
import { RecommendationsPanel } from "@/components/merchant/dashboard/RecommendationsPanel";
import { GoalsPanel } from "@/components/merchant/dashboard/GoalsPanel";
import { MerchantProgressCard } from "@/components/merchant/dashboard/MerchantProgressCard";
import {
  ExecutiveSummaryWidget,
  MerchantHealthWidget,
  CatalogIssuesWidget,
  QuickActionsWidget,
  TrustWidget,
  RecentActivityWidget,
} from "@/components/merchant/command-center/widgets";
import { ViewsWidget } from "@/components/merchant/analytics/widgets/ViewsWidget";
import { TrafficWidget } from "@/components/merchant/analytics/widgets/TrafficWidget";
import { TopProductsWidget } from "@/components/merchant/analytics/widgets/TopProductsWidget";
import { MerchantTrafficWidget } from "@/components/merchant/analytics/widgets/MerchantTrafficWidget";
import { FunnelWidget } from "@/components/merchant/analytics/widgets/FunnelWidget";
import { SessionWidget } from "@/components/merchant/analytics/widgets/SessionWidget";
import type {
  MerchantDashboardStats,
  MerchantScoreBreakdown,
  MerchantRecommendation,
  MerchantLevel,
  MerchantGoal,
  MerchantProfileCompletion,
} from "@/types/merchant";
import type { CommandCenterData } from "@/src/domains/merchant-intelligence/types";
import type {
  MerchantAnalyticsSummary,
  ProductAnalyticsResult,
  TrafficAnalyticsResult,
  FunnelResult,
} from "@/src/domains/merchant-analytics/types";
import { AnalyticsWindow } from "@/src/domains/merchant-analytics/types/enums";
import {
  TodaysPrioritiesWidget,
  RecommendationsWidget,
  OpportunitiesWidget,
  CompletedImprovementsWidget,
  PendingImprovementsWidget,
  GrowthTimelineWidget,
} from "@/components/merchant/decision-center/widgets";
import {
  CatalogHealthScoreWidget,
  ProductHealthListWidget,
  CatalogEvolutionWidget,
  CatalogInsightsWidget,
} from "@/components/merchant/catalog/widgets";
import {
  TodaysPlanWidget,
  TopOpportunitiesWidget,
  HighImpactActionsWidget,
  CompletedGrowthWidget,
  GrowthTimelineWidget as GrowthEngineTimelineWidget,
  RecommendationHistoryWidget,
} from "@/components/merchant/growth-center/widgets";
import type { DecisionCenterData } from "@/src/domains/merchant-decision/types";
import type { Recommendation } from "@/src/domains/merchant-decision/types/decision.types";
import { ActionStatus } from "@/src/domains/merchant-decision/types/enums";
import type { CatalogHealthBreakdown, CatalogHealthHistory, ProductHealthRecord } from "@/src/domains/catalog-intelligence/types";
import type { GrowthDashboard } from "@/src/domains/growth-engine/types/growth.types";
import { RefreshCw, Upload, Clock, AlertCircle, Settings, LayoutDashboard, Target, BarChart2, Brain, Package, TrendingUp } from "lucide-react";

// ── Legacy data types ─────────────────────────────────────────────────────────

interface LegacyData {
  stats: MerchantDashboardStats;
  scoreBreakdown: MerchantScoreBreakdown;
  level: MerchantLevel;
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
type ActiveTab = "growth" | "command-center" | "analytics" | "decision" | "catalog" | "score-metas";

interface CatalogData {
  breakdown: CatalogHealthBreakdown | null;
  products_needing_attention: ProductHealthRecord[] | null;
  history: CatalogHealthHistory | null;
}

type GrowthData = GrowthDashboard | null;

interface AnalyticsData {
  summary: MerchantAnalyticsSummary | null;
  products: ProductAnalyticsResult | null;
  traffic: TrafficAnalyticsResult | null;
  funnel: FunnelResult | null;
  window: AnalyticsWindow;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

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

// ── Skeletons ─────────────────────────────────────────────────────────────────

function CommandCenterSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-36 rounded-2xl bg-slate-800" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-slate-800" />)}
      </div>
      <div className="h-48 rounded-2xl bg-slate-800" />
      <div className="h-56 rounded-2xl bg-slate-800" />
    </div>
  );
}

function LegacySkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-slate-800 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="h-64 bg-slate-800 rounded-xl" />
        <div className="h-64 bg-slate-800 rounded-xl" />
        <div className="h-64 bg-slate-800 rounded-xl" />
      </div>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({ kind, message, onRetry }: { kind: ErrorKind; message: string; onRetry: () => void }) {
  if (kind === "not_found") {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
          <Settings className="h-6 w-6 text-amber-400" />
        </div>
        <h3 className="mb-2 font-semibold text-white">Configuração incompleta</h3>
        <p className="mb-5 text-sm text-slate-400">
          Não encontramos um perfil de lojista vinculado à sua conta.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/merchant/register"
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Finalizar configuração
          </Link>
          <button
            onClick={onRetry}
            className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
        <AlertCircle className="h-6 w-6 text-red-400" />
      </div>
      <h3 className="mb-2 font-semibold text-white">
        {kind === "network" ? "Sem conexão" : "Erro ao carregar dados"}
      </h3>
      <p className="mb-1 text-sm text-slate-400">
        {kind === "network"
          ? "Verifique sua conexão e tente novamente."
          : "Ocorreu um erro ao buscar os dados da sua loja."}
      </p>
      {kind === "server" && (
        <p className="mb-4 font-mono text-xs text-slate-600">{message}</p>
      )}
      <button
        onClick={onRetry}
        className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
      >
        Tentar novamente →
      </button>
    </div>
  );
}

// ── Welcome banner ────────────────────────────────────────────────────────────

function WelcomeBanner({ companyName }: { companyName: string }) {
  return (
    <div className="mb-5 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/80 to-slate-900 p-6">
      <p className="mb-2 text-2xl">🎉</p>
      <h2 className="mb-1 text-lg font-bold text-white">
        Bem-vindo ao ParaguAI{companyName ? `, ${companyName}` : ""}!
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-slate-400">
        Sua loja foi criada com sucesso. Agora vamos publicar seus primeiros produtos e começar a aparecer para compradores.
      </p>
      <div className="mb-5 flex items-center gap-1.5 text-xs text-emerald-400">
        <Clock className="h-3.5 w-3.5" />
        Tempo estimado: 2 minutos
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/merchant/imports/new"
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          <Upload className="h-4 w-4" />
          Importar produtos
        </Link>
        <Link
          href="/merchant/onboarding"
          className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
        >
          Conhecer o Merchant OS
        </Link>
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
  attentionCount,
  decisionCount,
  catalogIssueCount,
  growthCount,
}: {
  active: ActiveTab;
  onChange: (t: ActiveTab) => void;
  attentionCount: number;
  decisionCount: number;
  catalogIssueCount: number;
  growthCount: number;
}) {
  const tabs: { id: ActiveTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "growth", label: "Growth Center", icon: TrendingUp },
    { id: "command-center", label: "Command Center", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
    { id: "decision", label: "Decision Center", icon: Brain },
    { id: "catalog", label: "Catálogo", icon: Package },
    { id: "score-metas", label: "Score & Metas", icon: Target },
  ];

  return (
    <div className="mb-6 flex gap-1 rounded-xl border border-slate-700/50 bg-slate-900/50 p-1">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
            active === id
              ? "bg-slate-700 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          <Icon size={14} />
          {label}
          {id === "growth" && growthCount > 0 && (
            <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-emerald-500" />
          )}
          {id === "command-center" && attentionCount > 0 && (
            <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-red-500" />
          )}
          {id === "decision" && decisionCount > 0 && (
            <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-amber-500" />
          )}
          {id === "catalog" && catalogIssueCount > 0 && (
            <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-orange-500" />
          )}
        </button>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MerchantDashboardPage() {
  const [commandData, setCommandData] = useState<CommandCenterData | null>(null);
  const [legacyData, setLegacyData] = useState<LegacyData | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    summary: null, products: null, traffic: null, funnel: null,
    window: AnalyticsWindow.Last7Days,
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [decisionData, setDecisionData] = useState<DecisionCenterData | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [catalogData, setCatalogData] = useState<CatalogData>({
    breakdown: null,
    products_needing_attention: null,
    history: null,
  });
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [growthData, setGrowthData] = useState<GrowthData>(null);
  const [growthLoading, setGrowthLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>("growth");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        let ccRes = await fetch("/api/merchant/command-center");
        if (ccRes.status === 403 || ccRes.status === 404) {
          await fetch("/api/merchant/auth/register", { method: "POST" });
          ccRes = await fetch("/api/merchant/command-center");
        }
        if (ccRes.status === 401) {
          if (!cancelled) { setErrorKind("auth"); setErrorMsg("Sessão expirada"); setLoading(false); }
          return;
        }

        const [ccJson, legacyRes] = await Promise.all([
          ccRes.json() as Promise<{ ok?: boolean; data?: CommandCenterData; error?: string }>,
          fetch("/api/merchant/dashboard/stats"),
        ]);
        const legacyJson = await legacyRes.json() as { data?: LegacyData; error?: string };

        if (!cancelled) {
          if (ccJson.data) setCommandData(ccJson.data);
          if (legacyJson.data) setLegacyData(legacyJson.data);
          if (!ccJson.data && !legacyJson.data) {
            const errMsg = (ccJson.error ?? legacyJson.error) ?? "Erro desconhecido";
            setErrorKind(ccRes.status === 403 || ccRes.status === 404 ? "not_found" : "server");
            setErrorMsg(errMsg);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Erro de rede";
          setErrorKind("network");
          setErrorMsg(msg);
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    if (activeTab !== "analytics" || analyticsLoading) return;

    let cancelled = false;

    async function loadAnalytics() {
      setAnalyticsLoading(true);
      const w = analyticsData.window;
      const [summaryRes, productsRes, trafficRes, funnelRes] = await Promise.all([
        fetch(`/api/merchant/analytics?window=${w}`),
        fetch(`/api/merchant/analytics/products?window=${w}`),
        fetch(`/api/merchant/analytics/traffic?window=${w}`),
        fetch(`/api/analytics/funnel?window=${w}`),
      ]);

      const [summary, products, traffic, funnel] = await Promise.all([
        summaryRes.ok ? summaryRes.json() as Promise<MerchantAnalyticsSummary> : null,
        productsRes.ok ? productsRes.json() as Promise<ProductAnalyticsResult> : null,
        trafficRes.ok ? trafficRes.json() as Promise<TrafficAnalyticsResult> : null,
        funnelRes.ok ? funnelRes.json() as Promise<FunnelResult> : null,
      ]);

      if (!cancelled) {
        setAnalyticsData((prev) => ({ ...prev, summary, products, traffic, funnel }));
        setAnalyticsLoading(false);
      }
    }

    loadAnalytics().catch(() => { if (!cancelled) setAnalyticsLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, analyticsData.window]);

  useEffect(() => {
    if (activeTab !== "decision" || decisionLoading || decisionData) return;

    let cancelled = false;

    async function loadDecision() {
      setDecisionLoading(true);
      const res = await fetch("/api/merchant/decision-center");
      if (!res.ok) {
        if (!cancelled) setDecisionLoading(false);
        return;
      }
      const json = await res.json() as { ok?: boolean; data?: DecisionCenterData };
      if (!cancelled) {
        if (json.data) setDecisionData(json.data);
        setDecisionLoading(false);
      }
    }

    loadDecision().catch(() => { if (!cancelled) setDecisionLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "catalog" || catalogLoading || catalogData.breakdown) return;

    let cancelled = false;

    async function loadCatalog() {
      setCatalogLoading(true);
      const [healthRes, historyRes] = await Promise.all([
        fetch("/api/merchant/catalog/health"),
        fetch("/api/merchant/catalog/history"),
      ]);
      const [health, history] = await Promise.all([
        healthRes.ok ? healthRes.json() as Promise<{ breakdown: CatalogHealthBreakdown; products_needing_attention: ProductHealthRecord[] }> : null,
        historyRes.ok ? historyRes.json() as Promise<CatalogHealthHistory> : null,
      ]);
      if (!cancelled) {
        setCatalogData({
          breakdown: health?.breakdown ?? null,
          products_needing_attention: health?.products_needing_attention ?? null,
          history: history ?? null,
        });
        setCatalogLoading(false);
      }
    }

    loadCatalog().catch(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "growth" || growthLoading || growthData) return;

    let cancelled = false;

    async function loadGrowth() {
      setGrowthLoading(true);
      const res = await fetch("/api/merchant/growth");
      if (!res.ok) {
        if (!cancelled) setGrowthLoading(false);
        return;
      }
      const json = await res.json() as { ok?: boolean; data?: GrowthDashboard };
      if (!cancelled) {
        if (json.data) setGrowthData(json.data);
        setGrowthLoading(false);
      }
    }

    loadGrowth().catch(() => { if (!cancelled) setGrowthLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function handleAcceptRecommendation(rec: Recommendation) {
    await fetch("/api/merchant/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rule_id: rec.rule_id,
        recommendation_id: rec.id,
        title: rec.title,
        category: rec.category,
        priority: rec.priority,
      }),
    });
    setDecisionData((prev) =>
      prev ? { ...prev, all_recommendations: prev.all_recommendations.filter((r) => r.id !== rec.id) } : prev
    );
  }

  async function handleDismissRecommendation(id: string) {
    setDecisionData((prev) =>
      prev ? { ...prev, all_recommendations: prev.all_recommendations.filter((r) => r.id !== id) } : prev
    );
  }

  async function handleCompleteAction(id: string) {
    await fetch(`/api/merchant/actions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: ActionStatus.Completed }),
    });
    setDecisionData((prev) => {
      if (!prev) return prev;
      const action = prev.pending_actions.find((a) => a.id === id);
      if (!action) return prev;
      return {
        ...prev,
        pending_actions: prev.pending_actions.filter((a) => a.id !== id),
        completed_actions: [{ ...action, status: ActionStatus.Completed, acted_at: new Date().toISOString() }, ...prev.completed_actions],
      };
    });
  }

  function handleAnalyticsWindow(w: AnalyticsWindow) {
    setAnalyticsData((prev) => ({
      ...prev,
      window: w,
      summary: null, products: null, traffic: null, funnel: null,
    }));
    setAnalyticsLoading(false);
  }

  async function dismissRec(id: string) {
    await fetch("/api/merchant/recommendations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setLegacyData((prev) =>
      prev ? { ...prev, recommendations: prev.recommendations.filter((r) => r.id !== id) } : prev
    );
  }

  const name = legacyData?.merchant.company_name ?? commandData?.summary.companyName;
  const plan = legacyData?.merchant.plan ?? commandData?.summary.plan;
  const lastSync = commandData?.summary.lastImportAt ?? legacyData?.stats.lastImportAt;
  const isFirstAccess = legacyData ? !legacyData.merchant.onboarding_done : false;
  const attentionCount = commandData?.health.overallAttentionCount ?? 0;
  const decisionCount = decisionData?.todays_priorities.length ?? 0;
  const catalogIssueCount = catalogData.breakdown
    ? (catalogData.breakdown.critical_count + catalogData.breakdown.attention_count)
    : 0;
  const growthCount = growthData?.todays_plan.plan_items.length ?? 0;

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <MerchantSidebar companyName={name} plan={plan} />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">

          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">
                {greeting()}{name ? `, ${name}` : ""}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? "Carregando..."
                  : lastSync
                    ? <>Última sync <span className="text-slate-400">{relativeTime(lastSync)}</span></>
                    : "Sua loja ainda não tem produtos. Vamos mudar isso?"}
              </p>
            </div>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-400 transition-colors hover:bg-slate-700 disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>

          {loading ? (
            <CommandCenterSkeleton />
          ) : errorKind ? (
            <ErrorState kind={errorKind} message={errorMsg} onRetry={() => setRefreshKey((k) => k + 1)} />
          ) : (
            <>
              {isFirstAccess && <WelcomeBanner companyName={name ?? ""} />}

              <TabBar active={activeTab} onChange={setActiveTab} attentionCount={attentionCount} decisionCount={decisionCount} catalogIssueCount={catalogIssueCount} growthCount={growthCount} />

              {/* ── Growth Center Tab ─────────────────────────────────── */}
              {activeTab === "growth" && (
                <div className="space-y-5">
                  {growthLoading ? (
                    <div className="space-y-4 animate-pulse">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-40 rounded-xl bg-slate-800" />
                      ))}
                    </div>
                  ) : growthData ? (
                    <>
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <TodaysPlanWidget data={growthData.todays_plan} />
                        <TopOpportunitiesWidget data={growthData.opportunities} />
                      </div>
                      <HighImpactActionsWidget data={growthData.all_recommendations} />
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <GrowthEngineTimelineWidget data={growthData.recent_history} />
                        <div className="flex flex-col gap-5">
                          <CompletedGrowthWidget data={growthData.recent_history} />
                          <RecommendationHistoryWidget data={growthData.recent_history} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
                      <p className="text-sm text-slate-500">Não foi possível carregar o Growth Center.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Command Center Tab ─────────────────────────────────── */}
              {activeTab === "command-center" && commandData && (
                <div className="space-y-5">
                  <ExecutiveSummaryWidget data={commandData.summary} />
                  <QuickActionsWidget data={commandData.quickActions} />
                  <MerchantHealthWidget data={commandData.health} />

                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <CatalogIssuesWidget data={commandData.catalog} />
                    <div className="flex flex-col gap-5">
                      <TrustWidget data={commandData.summary} />
                      <RecentActivityWidget data={commandData.summary} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Analytics Tab ─────────────────────────────────────── */}
              {activeTab === "analytics" && (
                <div className="space-y-5">
                  {/* Window selector */}
                  <div className="flex gap-2">
                    {(Object.values(AnalyticsWindow) as AnalyticsWindow[]).map((w) => (
                      <button
                        key={w}
                        onClick={() => handleAnalyticsWindow(w)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          analyticsData.window === w
                            ? "bg-cyan-600 text-white"
                            : "bg-slate-800 text-slate-400 hover:text-slate-300"
                        }`}
                      >
                        {{
                          [AnalyticsWindow.Today]: "Hoje",
                          [AnalyticsWindow.Last7Days]: "7 dias",
                          [AnalyticsWindow.Last30Days]: "30 dias",
                          [AnalyticsWindow.Last90Days]: "90 dias",
                        }[w]}
                      </button>
                    ))}
                  </div>

                  {analyticsLoading ? (
                    <div className="space-y-4 animate-pulse">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-40 rounded-xl bg-slate-800" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <ViewsWidget data={analyticsData.summary} />
                        <TrafficWidget data={analyticsData.summary} />
                        <SessionWidget data={analyticsData.summary} />
                      </div>
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <TopProductsWidget data={analyticsData.products} />
                        <MerchantTrafficWidget data={analyticsData.traffic} />
                      </div>
                      <FunnelWidget data={analyticsData.funnel} />
                    </>
                  )}
                </div>
              )}

              {/* ── Decision Center Tab ───────────────────────────────── */}
              {activeTab === "decision" && (
                <div className="space-y-5">
                  {decisionLoading ? (
                    <div className="space-y-4 animate-pulse">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-40 rounded-xl bg-slate-800" />
                      ))}
                    </div>
                  ) : decisionData ? (
                    <>
                      <TodaysPrioritiesWidget data={decisionData.todays_priorities} />
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <OpportunitiesWidget data={decisionData.opportunities} />
                        <PendingImprovementsWidget
                          data={decisionData.pending_actions}
                          onComplete={handleCompleteAction}
                        />
                      </div>
                      <RecommendationsWidget
                        data={decisionData.all_recommendations}
                        onAccept={handleAcceptRecommendation}
                        onDismiss={handleDismissRecommendation}
                      />
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <CompletedImprovementsWidget data={decisionData.completed_actions} />
                        <GrowthTimelineWidget data={[...decisionData.completed_actions, ...decisionData.pending_actions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())} />
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
                      <p className="text-sm text-slate-500">Não foi possível carregar o Decision Center.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Catálogo Tab ───────────────────────────────────────── */}
              {activeTab === "catalog" && (
                <div className="space-y-5">
                  {catalogLoading ? (
                    <div className="space-y-4 animate-pulse">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-40 rounded-xl bg-slate-800" />
                      ))}
                    </div>
                  ) : catalogData.breakdown ? (
                    <>
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <CatalogHealthScoreWidget data={catalogData.breakdown} />
                        {catalogData.history && (
                          <CatalogEvolutionWidget data={catalogData.history} />
                        )}
                      </div>
                      <CatalogInsightsWidget
                        breakdown={catalogData.breakdown}
                        products={catalogData.products_needing_attention ?? []}
                      />
                      <ProductHealthListWidget data={catalogData.products_needing_attention ?? []} />
                    </>
                  ) : (
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
                      <p className="text-sm text-slate-500">Não foi possível carregar os dados do catálogo.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Score & Metas Tab ──────────────────────────────────── */}
              {activeTab === "score-metas" && (
                <div className="space-y-5">
                  {legacyData ? (
                    <>
                      <StatsGrid stats={legacyData.stats} />
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                        <ScoreCard score={legacyData.scoreBreakdown} level={legacyData.level} />
                        <GoalsPanel goals={legacyData.goals} />
                        <MerchantProgressCard completion={legacyData.profileCompletion} />
                      </div>
                      <RecommendationsPanel
                        recommendations={legacyData.recommendations}
                        onDismiss={dismissRec}
                      />
                    </>
                  ) : (
                    <LegacySkeleton />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
