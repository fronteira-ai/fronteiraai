import type { Recommendation } from "@/src/domains/merchant-decision/types/decision.types";
import { RecommendationPriority, EstimatedEffort } from "@/src/domains/merchant-decision/types/enums";
import { Zap, Clock, AlertTriangle, ChevronRight } from "lucide-react";

interface Props {
  data: Recommendation[];
}

const PRIORITY_COLORS: Record<RecommendationPriority, string> = {
  [RecommendationPriority.Critical]: "bg-red-500/15 text-red-400 border-red-500/30",
  [RecommendationPriority.High]:     "bg-amber-500/15 text-amber-400 border-amber-500/30",
  [RecommendationPriority.Medium]:   "bg-blue-500/15 text-blue-400 border-blue-500/30",
  [RecommendationPriority.Low]:      "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const PRIORITY_LABELS: Record<RecommendationPriority, string> = {
  [RecommendationPriority.Critical]: "Crítica",
  [RecommendationPriority.High]:     "Alta",
  [RecommendationPriority.Medium]:   "Média",
  [RecommendationPriority.Low]:      "Baixa",
};

const EFFORT_LABELS: Record<EstimatedEffort, string> = {
  [EstimatedEffort.Minutes]: "Minutos",
  [EstimatedEffort.Hours]:   "Horas",
  [EstimatedEffort.Days]:    "Dias",
};

export function TodaysPrioritiesWidget({ data }: Props) {
  return (
    <section
      aria-label="Prioridades de Hoje"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Prioridades de Hoje</h2>
        </div>
        {data.length > 0 && (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
            {data.length} ação{data.length !== 1 ? "ões" : ""}
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
            <Zap className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-white">Tudo em dia!</p>
          <p className="text-xs text-slate-500">Nenhuma ação prioritária para hoje.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((rec, i) => (
            <li
              key={rec.id}
              className="flex items-start gap-3 rounded-xl border border-slate-700/40 bg-slate-800/40 p-3 transition-colors hover:bg-slate-800/60"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-300">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{rec.title}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{rec.reason}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[rec.priority]}`}>
                    {PRIORITY_LABELS[rec.priority]}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock className="h-2.5 w-2.5" />
                    {rec.estimated_minutes} min · {EFFORT_LABELS[rec.estimated_effort]}
                  </span>
                </div>
              </div>
              {rec.action_url && (
                <a
                  href={rec.action_url}
                  className="ml-1 shrink-0 text-slate-500 transition-colors hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {data.some((r) => r.priority === RecommendationPriority.Critical) && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
          <p className="text-xs text-red-300">Há recomendações críticas que precisam de atenção imediata.</p>
        </div>
      )}
    </section>
  );
}
