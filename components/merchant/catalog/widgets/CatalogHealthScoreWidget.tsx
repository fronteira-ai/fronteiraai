import type { CatalogHealthBreakdown } from "@/src/domains/catalog-intelligence/types";

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  return (
    <div className={`text-5xl font-bold tabular-nums ${color}`}>
      {score}<span className="text-2xl text-slate-500">%</span>
    </div>
  );
}

function StatusBar({
  label,
  count,
  pct,
  color,
}: {
  label: string;
  count: number;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 tabular-nums">
          {count} <span className="text-slate-600">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CatalogHealthScoreWidget({ data }: { data: CatalogHealthBreakdown }) {
  if (data.total === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="mb-1 text-sm font-semibold text-white">Saúde do Catálogo</h3>
        <p className="text-sm text-slate-500">Nenhum produto publicado ainda.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Saúde do Catálogo</h3>
          <p className="mt-0.5 text-xs text-slate-500">{data.total} produtos analisados</p>
        </div>
        <ScoreRing score={data.health_score} />
      </div>

      <div className="space-y-3">
        <StatusBar label="Ideal" count={data.ideal_count} pct={data.ideal_pct} color="bg-emerald-500" />
        <StatusBar label="Atenção" count={data.attention_count} pct={data.attention_pct} color="bg-amber-500" />
        <StatusBar label="Crítico" count={data.critical_count} pct={data.critical_pct} color="bg-red-500" />
      </div>

      {data.critical_count > 0 && (
        <p className="mt-4 text-xs text-red-400">
          {data.critical_count} produto{data.critical_count > 1 ? "s" : ""} precisam de atenção imediata.
        </p>
      )}
    </div>
  );
}
