"use client";

import type { DecisionAction } from "@/src/domains/merchant-decision/types/decision.types";
import { RecommendationCategory, RecommendationPriority } from "@/src/domains/merchant-decision/types/enums";
import { Clock, CheckCircle } from "lucide-react";

interface Props {
  data: DecisionAction[];
  onComplete: (id: string) => Promise<void>;
}

const PRIORITY_BADGE: Record<RecommendationPriority, string> = {
  [RecommendationPriority.Critical]: "bg-red-500/15 text-red-400 border-red-500/30",
  [RecommendationPriority.High]:     "bg-amber-500/15 text-amber-400 border-amber-500/30",
  [RecommendationPriority.Medium]:   "bg-blue-500/15 text-blue-400 border-blue-500/30",
  [RecommendationPriority.Low]:      "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const PRIORITY_LABEL: Record<RecommendationPriority, string> = {
  [RecommendationPriority.Critical]: "Crítica",
  [RecommendationPriority.High]:     "Alta",
  [RecommendationPriority.Medium]:   "Média",
  [RecommendationPriority.Low]:      "Baixa",
};

const CATEGORY_LABEL: Record<RecommendationCategory, string> = {
  [RecommendationCategory.Catalog]:     "Catálogo",
  [RecommendationCategory.Trust]:       "Trust",
  [RecommendationCategory.Analytics]:   "Analytics",
  [RecommendationCategory.Profile]:     "Perfil",
  [RecommendationCategory.Opportunity]: "Oportunidade",
  [RecommendationCategory.Operational]: "Operacional",
};

export function PendingImprovementsWidget({ data, onComplete }: Props) {
  return (
    <section
      aria-label="Melhorias Pendentes"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Melhorias Pendentes</h2>
        </div>
        {data.length > 0 && (
          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
            {data.length}
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Clock className="h-8 w-8 text-slate-700" />
          <p className="text-sm text-slate-500">Nenhuma melhoria pendente.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((action) => (
            <li
              key={action.id}
              className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-slate-800/40 px-4 py-3 transition-colors hover:bg-slate-800/60"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{action.title}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className={`rounded border px-1 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE[action.priority]}`}>
                    {PRIORITY_LABEL[action.priority]}
                  </span>
                  <span className="text-[10px] text-slate-500">{CATEGORY_LABEL[action.category]}</span>
                </div>
              </div>
              <button
                onClick={() => onComplete(action.id)}
                className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Concluir
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
