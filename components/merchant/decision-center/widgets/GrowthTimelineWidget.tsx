import type { DecisionAction } from "@/src/domains/merchant-decision/types/decision.types";
import { RecommendationCategory, ActionStatus } from "@/src/domains/merchant-decision/types/enums";
import { GitBranch, CheckCircle2, XCircle, MinusCircle, Clock } from "lucide-react";

interface Props {
  data: DecisionAction[];
}

const STATUS_ICON: Record<ActionStatus, typeof CheckCircle2> = {
  [ActionStatus.Completed]: CheckCircle2,
  [ActionStatus.Ignored]:   XCircle,
  [ActionStatus.Postponed]: Clock,
  [ActionStatus.Pending]:   MinusCircle,
};

const STATUS_COLOR: Record<ActionStatus, string> = {
  [ActionStatus.Completed]: "text-emerald-400",
  [ActionStatus.Ignored]:   "text-slate-500",
  [ActionStatus.Postponed]: "text-amber-400",
  [ActionStatus.Pending]:   "text-blue-400",
};

const STATUS_LABEL: Record<ActionStatus, string> = {
  [ActionStatus.Completed]: "Concluída",
  [ActionStatus.Ignored]:   "Ignorada",
  [ActionStatus.Postponed]: "Adiada",
  [ActionStatus.Pending]:   "Pendente",
};

const CATEGORY_LABEL: Record<RecommendationCategory, string> = {
  [RecommendationCategory.Catalog]:     "Catálogo",
  [RecommendationCategory.Trust]:       "Trust",
  [RecommendationCategory.Analytics]:   "Analytics",
  [RecommendationCategory.Profile]:     "Perfil",
  [RecommendationCategory.Opportunity]: "Oportunidade",
  [RecommendationCategory.Operational]: "Operacional",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
}

export function GrowthTimelineWidget({ data }: Props) {
  return (
    <section
      aria-label="Timeline de Crescimento"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-purple-400" />
        <h2 className="text-sm font-semibold text-white">Timeline de Crescimento</h2>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <GitBranch className="h-8 w-8 text-slate-700" />
          <p className="text-sm text-slate-500">Nenhuma atividade registrada ainda.</p>
          <p className="text-xs text-slate-600">
            Seu histórico de ações e melhorias aparecerá aqui ao longo do tempo.
          </p>
        </div>
      ) : (
        <ol className="relative border-l border-slate-700/50">
          {data.map((action) => {
            const Icon = STATUS_ICON[action.status];
            const colorClass = STATUS_COLOR[action.status];
            return (
              <li key={action.id} className="mb-4 ml-5 last:mb-0">
                <div className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-slate-900`}>
                  <Icon className={`h-4 w-4 ${colorClass}`} />
                </div>
                <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 px-4 py-3">
                  <div className="mb-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-white">{action.title}</p>
                    <span className={`shrink-0 text-[10px] font-medium ${colorClass}`}>
                      {STATUS_LABEL[action.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{CATEGORY_LABEL[action.category]}</span>
                    <span>·</span>
                    <span>{formatDate(action.acted_at ?? action.created_at)}</span>
                    {action.notes && (
                      <>
                        <span>·</span>
                        <span className="text-slate-400">{action.notes}</span>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
