"use client";
import { useEffect, useState } from "react";
import { LayoutDashboard, Map, Activity, Star, BellRing, RefreshCw } from "lucide-react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { HealthScoreGauge } from "@/components/admin/marketplace-operations/widgets/HealthScoreGauge";
import { FactorBreakdownTable } from "@/components/admin/marketplace-operations/widgets/FactorBreakdownTable";
import { KpiRow } from "@/components/admin/marketplace-operations/widgets/KpiRow";
import { CoverageGapList } from "@/components/admin/marketplace-operations/widgets/CoverageGapList";
import { ConnectorHealthTable } from "@/components/admin/marketplace-operations/widgets/ConnectorHealthTable";
import { MerchantPriorityTable } from "@/components/admin/marketplace-operations/widgets/MerchantPriorityTable";
import { AlertsList } from "@/components/admin/marketplace-operations/widgets/AlertsList";
import type { MarketplaceOperationsOverview } from "@/src/domains/marketplace-operations/dashboard/MarketplaceOperationsDashboardService";

type ActiveTab = "overview" | "coverage" | "connectors" | "priority" | "alerts";

const TABS: { id: ActiveTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { id: "coverage", label: "Cobertura", icon: Map },
  { id: "connectors", label: "Conectores", icon: Activity },
  { id: "priority", label: "Prioridade", icon: Star },
  { id: "alerts", label: "Alertas", icon: BellRing },
];

function TabBar({ active, onChange, alertCount }: { active: ActiveTab; onChange: (t: ActiveTab) => void; alertCount: number }) {
  return (
    <div className="mb-6 flex gap-1 rounded-xl border border-slate-700/50 bg-slate-900/50 p-1">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
            active === id ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-300"
          }`}
        >
          <Icon size={14} />
          {label}
          {id === "alerts" && alertCount > 0 && (
            <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-red-500" />
          )}
        </button>
      ))}
    </div>
  );
}

// Marketplace Operations Dashboard (Release 1.8 — Program 0 — Wave 1, Epic 7).
// First /admin page to use the internal-tab pattern already established in
// app/merchant/dashboard/page.tsx — but fetches the whole composed overview
// once (GET /dashboard/overview already does the Promise.allSettled
// aggregation server-side), rather than a separate lazy fetch per tab.
// Growth/Analytics/Claims/Canonical-merge review already have dedicated
// homes (merchant dashboard, /admin/claims, /admin/canonical-catalog) — this
// dashboard doesn't re-embed their UI.
export default function MarketplaceOperationsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [data, setData] = useState<MarketplaceOperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/admin/marketplace-operations/dashboard/overview")
      .then((r) => r.json() as Promise<{ data: MarketplaceOperationsOverview }>)
      .then((json) => setData(json.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  function refresh() {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }

  async function handleAlertAction(id: string, action: "acknowledge" | "resolve" | "ignore") {
    await fetch(`/api/admin/marketplace-operations/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    refresh();
  }

  const pendingAlertCount = data?.alerts?.length ?? 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Marketplace Operations</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Centro de Operações do Marketplace — saúde, cobertura, conectores e prioridade em tempo real
          </p>
        </div>
        <AdminButton
          variant="secondary"
          icon={<RefreshCw className="w-4 h-4" />}
          loading={loading}
          onClick={refresh}
        >
          Atualizar
        </AdminButton>
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} alertCount={pendingAlertCount} />

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
              <HealthScoreGauge health={data?.health ?? null} />
              {data?.health && <FactorBreakdownTable factors={data.health.factors} />}
              <KpiRow metrics={data?.metrics ?? null} />
            </div>
          )}

          {activeTab === "coverage" && <CoverageGapList coverage={data?.coverage ?? null} />}

          {activeTab === "connectors" && <ConnectorHealthTable connectors={data?.connectors ?? null} />}

          {activeTab === "priority" && <MerchantPriorityTable priority={data?.priority ?? null} />}

          {activeTab === "alerts" && <AlertsList alerts={data?.alerts ?? null} onAction={handleAlertAction} />}

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
