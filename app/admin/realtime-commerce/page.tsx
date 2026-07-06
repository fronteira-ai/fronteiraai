"use client";
import { useEffect, useState } from "react";
import { LayoutDashboard, Activity, TrendingUp, Store, Bell, RefreshCw } from "lucide-react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { MarketPulseCard } from "@/components/admin/realtime-commerce/widgets/MarketPulseCard";
import { LiveActivityFeed } from "@/components/admin/realtime-commerce/widgets/LiveActivityFeed";
import { TopMoversTable } from "@/components/admin/realtime-commerce/widgets/TopMoversTable";
import { StoreRankingTable } from "@/components/admin/realtime-commerce/widgets/StoreRankingTable";
import { PendingAlertsTable } from "@/components/admin/realtime-commerce/widgets/PendingAlertsTable";
import type { RealtimeCommerceOverview } from "@/src/domains/realtime-commerce";

type ActiveTab = "pulse" | "activity" | "movers" | "stores" | "alerts";

const TABS: { id: ActiveTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "pulse", label: "Market Pulse", icon: LayoutDashboard },
  { id: "activity", label: "Live Activity", icon: Activity },
  { id: "movers", label: "Top Movers", icon: TrendingUp },
  { id: "stores", label: "Lojas", icon: Store },
  { id: "alerts", label: "Alertas", icon: Bell },
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

// Real-Time Commerce Dashboard (Release 1.8 — Program A — Wave 2, Epic 10).
// Mirrors /admin/exchange exactly: single composed overview fetch, internal
// tabs, no per-tab round trips.
export default function RealtimeCommercePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("pulse");
  const [data, setData] = useState<RealtimeCommerceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/admin/realtime-commerce/overview")
      .then((r) => r.json() as Promise<{ data: RealtimeCommerceOverview }>)
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
          <h1 className="text-xl font-bold text-white">Real-Time Commerce Engine</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Detecção de mudanças, volatilidade, freshness e pulso do mercado em tempo quase real
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
          {activeTab === "pulse" && <MarketPulseCard pulse={data?.marketPulse ?? null} />}
          {activeTab === "activity" && <LiveActivityFeed entries={data?.liveActivity ?? null} />}
          {activeTab === "movers" && <TopMoversTable movers={data?.topMovers ?? null} />}
          {activeTab === "stores" && <StoreRankingTable stores={data?.topStores ?? null} />}
          {activeTab === "alerts" && <PendingAlertsTable alerts={data?.pendingAlerts ?? null} />}

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
