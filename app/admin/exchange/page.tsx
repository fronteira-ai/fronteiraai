"use client";
import { useEffect, useState } from "react";
import { LayoutDashboard, History, Activity, BarChart2, RefreshCw } from "lucide-react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { RateCard } from "@/components/admin/exchange/widgets/RateCard";
import { ProviderStatusTable } from "@/components/admin/exchange/widgets/ProviderStatusTable";
import { RateHistoryTable } from "@/components/admin/exchange/widgets/RateHistoryTable";
import { AnalyticsSummary } from "@/components/admin/exchange/widgets/AnalyticsSummary";
import { ConversionsCounterCard } from "@/components/admin/exchange/widgets/ConversionsCounterCard";
import type { ExchangeOverview } from "@/src/domains/exchange/dashboard/ExchangeDashboardService";

type ActiveTab = "overview" | "history" | "providers" | "analytics";

const TABS: { id: ActiveTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { id: "history", label: "Histórico", icon: History },
  { id: "providers", label: "Provedores", icon: Activity },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
];

function TabBar({ active, onChange }: { active: ActiveTab; onChange: (t: ActiveTab) => void }) {
  return (
    <div className="mb-6 flex gap-1 rounded-xl border border-slate-700/50 bg-slate-900/50 p-1">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
            active === id ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"
          }`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}

// Exchange Intelligence Dashboard (Release 1.8 — Program A — Wave 1, Epic 8).
// Mirrors /admin/marketplace-operations exactly: single composed overview
// fetch, internal tabs, no per-tab round trips.
export default function ExchangeDashboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [data, setData] = useState<ExchangeOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/admin/exchange/overview")
      .then((r) => r.json() as Promise<{ data: ExchangeOverview }>)
      .then((json) => setData(json.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  function refresh() {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Exchange Intelligence</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Cotação em tempo real, provedores, histórico e inteligência cambial
          </p>
        </div>
        <AdminButton variant="secondary" icon={<RefreshCw className="w-4 h-4" />} loading={loading} onClick={refresh}>
          Atualizar
        </AdminButton>
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === "overview" && (
            <div className="space-y-6">
              <RateCard rates={data?.currentRates ?? null} />
              <ConversionsCounterCard conversionsToday={data?.conversionsToday ?? null} />
            </div>
          )}

          {activeTab === "history" && <RateHistoryTable history={data?.history ?? null} />}

          {activeTab === "providers" && <ProviderStatusTable providers={data?.providerHealth ?? null} />}

          {activeTab === "analytics" && <AnalyticsSummary analytics={data?.analytics ?? null} />}

          {data && Object.keys(data.errors).length > 0 && (
            <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400">
              Algumas seções falharam ao carregar: {Object.keys(data.errors).join(", ")}. As demais seções
              continuam disponíveis (isolamento via Promise.allSettled).
            </div>
          )}
        </>
      )}
    </div>
  );
}
