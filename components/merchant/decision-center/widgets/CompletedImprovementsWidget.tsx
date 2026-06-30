import type { DecisionAction } from "@/src/domains/merchant-decision/types/decision.types";
import { RecommendationCategory } from "@/src/domains/merchant-decision/types/enums";
import { CheckCircle2, Trophy } from "lucide-react";

interface Props {
  data: DecisionAction[];
}

const CATEGORY_LABEL: Record<RecommendationCategory, string> = {
  [RecommendationCategory.Catalog]:     "Catálogo",
  [RecommendationCategory.Trust]:       "Trust",
  [RecommendationCategory.Analytics]:   "Analytics",
  [RecommendationCategory.Profile]:     "Perfil",
  [RecommendationCategory.Opportunity]: "Oportunidade",
  [RecommendationCategory.Operational]: "Operacional",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
}

export function CompletedImprovementsWidget({ data }: Props) {
  return (
    <section
      aria-label="Melhorias Concluídas"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">Melhorias Concluídas</h2>
        </div>
        {data.length > 0 && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
            {data.length}
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Trophy className="h-8 w-8 text-slate-700" />
          <p className="text-sm text-slate-500">Nenhuma melhoria concluída ainda.</p>
          <p className="text-xs text-slate-600">
            Conclua recomendações para ver seu histórico de melhorias aqui.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((action) => (
            <li
              key={action.id}
              className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-slate-800/40 px-4 py-3"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{action.title}</p>
                <p className="text-[10px] text-slate-500">{CATEGORY_LABEL[action.category]}</p>
              </div>
              <span className="shrink-0 text-[10px] text-slate-500">
                {formatDate(action.acted_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
