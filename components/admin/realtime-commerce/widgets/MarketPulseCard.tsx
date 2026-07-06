import type { MarketPulseSnapshot } from "@/src/domains/realtime-commerce";

function pct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}%`;
}

export function MarketPulseCard({ pulse }: { pulse: MarketPulseSnapshot | null }) {
  if (!pulse) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-500">
        Nenhum dado de Market Pulse disponível ainda.
      </div>
    );
  }

  const stats = [
    { label: "Preços alterados hoje", value: pulse.pricesChangedCount },
    { label: "Preços caíram", value: pulse.pricesDroppedCount, accent: "text-emerald-400" },
    { label: "Preços subiram", value: pulse.pricesRaisedCount, accent: "text-red-400" },
    { label: "Produtos novos", value: pulse.productsAddedCount },
    { label: "Produtos removidos", value: pulse.productsRemovedCount },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${s.accent ?? "text-white"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Categoria mais barata hoje</p>
          {pulse.cheapestCategory ? (
            <p className="text-white text-sm">
              {pulse.cheapestCategory.categoryName}{" "}
              <span className="text-emerald-400">{pct(pulse.cheapestCategory.avgPercentChange)}</span>
            </p>
          ) : (
            <p className="text-slate-600 text-sm">Sem dados</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Categoria mais cara hoje</p>
          {pulse.mostExpensiveMoveCategory ? (
            <p className="text-white text-sm">
              {pulse.mostExpensiveMoveCategory.categoryName}{" "}
              <span className="text-red-400">{pct(pulse.mostExpensiveMoveCategory.avgPercentChange)}</span>
            </p>
          ) : (
            <p className="text-slate-600 text-sm">Sem dados</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-slate-500 text-xs uppercase tracking-wide mb-3">Categorias mais ativas hoje</p>
        {pulse.topCategories.length === 0 ? (
          <p className="text-slate-600 text-sm">Sem dados</p>
        ) : (
          <div className="space-y-2">
            {pulse.topCategories.map((c) => (
              <div key={c.categoryId} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{c.categoryName}</span>
                <span className="text-slate-500">{c.changeCount} mudanças</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-slate-600 text-xs">Gerado em {new Date(pulse.generatedAt).toLocaleString("pt-BR")}</p>
    </div>
  );
}
