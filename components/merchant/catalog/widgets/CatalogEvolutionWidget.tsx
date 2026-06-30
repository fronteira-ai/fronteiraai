import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { CatalogHealthHistory } from "@/src/domains/catalog-intelligence/types";

function Sparkline({ snapshots }: { snapshots: { health_score: number }[] }) {
  if (snapshots.length === 0) return null;

  const scores = [...snapshots].reverse().map((s) => s.health_score);
  const max = Math.max(...scores, 1);

  return (
    <div className="flex items-end gap-0.5 h-12">
      {scores.map((s, i) => {
        const heightPct = Math.max((s / max) * 100, 4);
        const color =
          s >= 80 ? "bg-emerald-500" : s >= 50 ? "bg-amber-500" : "bg-red-500";
        return (
          <div
            key={i}
            title={`${s}%`}
            className={`flex-1 rounded-sm ${color} opacity-80`}
            style={{ height: `${heightPct}%` }}
          />
        );
      })}
    </div>
  );
}

const TREND_CONFIG = {
  improving: {
    icon: TrendingUp,
    color: "text-emerald-400",
    label: "Melhorando",
    bg: "bg-emerald-500/10",
  },
  stable: {
    icon: Minus,
    color: "text-slate-400",
    label: "Estável",
    bg: "bg-slate-700/30",
  },
  declining: {
    icon: TrendingDown,
    color: "text-red-400",
    label: "Caindo",
    bg: "bg-red-500/10",
  },
} as const;

export function CatalogEvolutionWidget({ data }: { data: CatalogHealthHistory }) {
  const cfg = TREND_CONFIG[data.trend];
  const TrendIcon = cfg.icon;

  const latest = data.snapshots[0]?.health_score ?? null;
  const oldest = data.snapshots[data.snapshots.length - 1]?.health_score ?? null;
  const delta =
    latest !== null && oldest !== null && data.snapshots.length >= 2
      ? latest - oldest
      : null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Evolução do Catálogo</h3>
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}
        >
          <TrendIcon className="h-3 w-3" />
          {cfg.label}
        </span>
      </div>

      {data.snapshots.length === 0 ? (
        <p className="text-sm text-slate-500">Histórico ainda não disponível.</p>
      ) : (
        <>
          <Sparkline snapshots={data.snapshots} />
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{data.snapshots.length} dias registrados</span>
            {delta !== null && (
              <span className={delta >= 0 ? "text-emerald-400" : "text-red-400"}>
                {delta >= 0 ? "+" : ""}{delta}pts no período
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
