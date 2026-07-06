import { AdminDataTable, type Column } from "@/components/admin/ui/AdminDataTable";
import type { ExchangeAnalyticsSnapshot } from "@/src/domains/exchange/analytics/ExchangeAnalyticsService";
import type { StoreReactionLag, CategoryImpact } from "@/src/domains/exchange/analytics/formulas";

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
      <p className="text-slate-500 text-xs">{label}</p>
      <p className="text-white text-xl font-semibold">{value}</p>
    </div>
  );
}

export function AnalyticsSummary({ analytics }: { analytics: ExchangeAnalyticsSnapshot | null }) {
  if (!analytics) {
    return <div className="text-sm text-slate-500">Analytics indisponível agora.</div>;
  }

  const reactionCols: Column<StoreReactionLag>[] = [
    { key: "storeId", header: "Loja (ID)" },
    {
      key: "averageLagHours",
      header: "Lag médio (proxy)",
      render: (r) => (r.averageLagHours !== null ? `${r.averageLagHours.toFixed(1)}h` : "—"),
    },
    { key: "movesObserved", header: "Movimentos observados" },
  ];

  const categoryCols: Column<CategoryImpact>[] = [
    { key: "categoryId", header: "Categoria (ID)" },
    {
      key: "averageAbsPriceChangePercent",
      header: "Variação média (simplificada)",
      render: (c) => (c.averageAbsPriceChangePercent !== null ? `${c.averageAbsPriceChangePercent.toFixed(1)}%` : "—"),
    },
    { key: "changesObserved", header: "Mudanças observadas" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile
          label="Variação do dólar (janela)"
          value={analytics.rateVariation ? `${analytics.rateVariation.variationPercent.toFixed(2)}%` : "—"}
        />
        <Tile label="Movimentos significativos" value={analytics.significantMoves.length} />
        <Tile
          label="Valorização do catálogo"
          value={analytics.catalogValueGrowth ? `${analytics.catalogValueGrowth.growthPercent.toFixed(2)}%` : "—"}
        />
        <Tile
          label="Economia do comprador (USD)"
          value={`$${analytics.buyerSavings.totalSavingsUsd.toFixed(2)}`}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-2">
          Velocidade de reação por loja <span className="text-slate-500 font-normal">(proxy de correlação, não causal)</span>
        </h3>
        <AdminDataTable
          columns={reactionCols}
          data={analytics.storeReactionLag}
          keyField="storeId"
          emptyMessage="Nenhuma loja com reação observada nesta janela."
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-2">
          Categorias mais impactadas <span className="text-slate-500 font-normal">(exposição simplificada, não modelo causal)</span>
        </h3>
        <AdminDataTable
          columns={categoryCols}
          data={analytics.categoryImpact}
          keyField="categoryId"
          emptyMessage="Nenhuma categoria com impacto observado nesta janela."
        />
      </div>
    </div>
  );
}
