import type { OpportunityCenter } from "@/src/domains/growth-engine/types/growth.types";
import { GrowthEffort, OpportunityCategory } from "@/src/domains/growth-engine/types/enums";
import { TrendingUp, Clock } from "lucide-react";

interface Props {
  data: OpportunityCenter;
}

const OPPORTUNITY_LABELS: Record<OpportunityCategory, string> = {
  [OpportunityCategory.HighDemand]:       "Alta demanda",
  [OpportunityCategory.LowCoverage]:      "Baixa cobertura",
  [OpportunityCategory.GrowingCategory]:  "Categoria em crescimento",
  [OpportunityCategory.NeglectedProduct]: "Produto negligenciado",
  [OpportunityCategory.StrategicProduct]: "Produto estratégico",
  [OpportunityCategory.IncompleteCatalog]:"Catálogo incompleto",
  [OpportunityCategory.IncompleteProfile]:"Perfil incompleto",
  [OpportunityCategory.IncompleteTrust]:  "Confiança incompleta",
};

const EFFORT_LABELS: Record<GrowthEffort, string> = {
  [GrowthEffort.Minutes]: "Minutos",
  [GrowthEffort.Hours]:   "Horas",
  [GrowthEffort.Days]:    "Dias",
};

const CATEGORY_COLORS: Partial<Record<OpportunityCategory, string>> = {
  [OpportunityCategory.HighDemand]:      "bg-emerald-500/15 text-emerald-400",
  [OpportunityCategory.GrowingCategory]: "bg-cyan-500/15 text-cyan-400",
  [OpportunityCategory.StrategicProduct]:"bg-purple-500/15 text-purple-400",
  [OpportunityCategory.LowCoverage]:     "bg-amber-500/15 text-amber-400",
};

export function TopOpportunitiesWidget({ data }: Props) {
  const topItems = data.opportunities.slice(0, 5);

  return (
    <section
      aria-label="Centro de Oportunidades"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Oportunidades</h2>
        </div>
        {data.total > 0 && (
          <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-400">
            {data.total} identificadas
          </span>
        )}
      </div>

      {topItems.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10">
            <TrendingUp className="h-5 w-5 text-cyan-400" />
          </div>
          <p className="text-sm font-medium text-white">Nenhuma oportunidade</p>
          <p className="text-xs text-slate-500">Adicione mais produtos para identificar oportunidades.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {topItems.map((opp) => (
            <li
              key={opp.id}
              className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-white">{opp.title}</p>
                {opp.opportunity_category && (
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[opp.opportunity_category] ?? "bg-slate-500/15 text-slate-400"}`}>
                    {OPPORTUNITY_LABELS[opp.opportunity_category]}
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-1 text-xs text-slate-400">{opp.expected_impact}</p>
              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
                <Clock className="h-2.5 w-2.5" />
                {opp.estimated_minutes} min · {EFFORT_LABELS[opp.estimated_effort]}
                <span className="ml-auto">Score {opp.priority_score}/100</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
