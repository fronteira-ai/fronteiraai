import type { TodaysPlan } from "@/src/domains/growth-engine/types/growth.types";
import { GrowthPriority, GrowthEffort, PlanTier } from "@/src/domains/growth-engine/types/enums";
import { Zap, Clock, ChevronRight, Lock, AlertTriangle } from "lucide-react";

interface Props {
  data: TodaysPlan;
}

const PRIORITY_COLORS: Record<GrowthPriority, string> = {
  [GrowthPriority.Critical]: "bg-red-500/15 text-red-400 border-red-500/30",
  [GrowthPriority.High]:     "bg-amber-500/15 text-amber-400 border-amber-500/30",
  [GrowthPriority.Medium]:   "bg-blue-500/15 text-blue-400 border-blue-500/30",
  [GrowthPriority.Low]:      "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const PRIORITY_LABELS: Record<GrowthPriority, string> = {
  [GrowthPriority.Critical]: "Crítica",
  [GrowthPriority.High]:     "Alta",
  [GrowthPriority.Medium]:   "Média",
  [GrowthPriority.Low]:      "Baixa",
};

const EFFORT_ICONS: Record<GrowthEffort, string> = {
  [GrowthEffort.Minutes]: "⚡",
  [GrowthEffort.Hours]:   "⏱",
  [GrowthEffort.Days]:    "📅",
};

export function TodaysPlanWidget({ data }: Props) {
  const hasCritical = data.plan_items.some((r) => r.priority === GrowthPriority.Critical);

  return (
    <section
      aria-label="Plano de Hoje"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">Plano de Hoje</h2>
        </div>
        <div className="flex items-center gap-2">
          {data.premium_items_available > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
              <Lock className="h-2.5 w-2.5" />
              +{data.premium_items_available} Premium
            </span>
          )}
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
            ~{data.estimated_total_minutes} min
          </span>
        </div>
      </div>

      {data.plan_items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
            <Zap className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-white">Tudo em ordem!</p>
          <p className="text-xs text-slate-500">Nenhuma ação prioritária para hoje.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.plan_items.map((rec, i) => (
            <li
              key={rec.id}
              className="flex items-start gap-3 rounded-xl border border-slate-700/40 bg-slate-800/40 p-3 transition-colors hover:bg-slate-800/60"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-300">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{rec.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{rec.priority_breakdown.reason}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[rec.priority]}`}>
                    {PRIORITY_LABELS[rec.priority]}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                    {EFFORT_ICONS[rec.estimated_effort]}
                    <Clock className="h-2.5 w-2.5" />
                    {rec.estimated_minutes} min
                  </span>
                  <span className="text-[10px] text-slate-600">
                    Score {rec.priority_score}/100
                  </span>
                  {rec.plan_tier === PlanTier.Premium && (
                    <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-400">
                      <Lock className="h-2 w-2" /> Premium
                    </span>
                  )}
                </div>
              </div>
              {rec.action_url && (
                <a href={rec.action_url} className="ml-1 shrink-0 text-slate-500 transition-colors hover:text-white">
                  <ChevronRight className="h-4 w-4" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasCritical && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
          <p className="text-xs text-red-300">Há ações críticas. Resolva-as primeiro para maximizar o impacto.</p>
        </div>
      )}

      <p className="mt-3 text-[10px] text-slate-600">
        {data.total_available} recomendações disponíveis — mostrando as {data.plan_items.length} mais impactantes.
      </p>
    </section>
  );
}
