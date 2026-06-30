import type { Opportunity } from "@/src/domains/merchant-decision/types/decision.types";
import { ImpactLevel } from "@/src/domains/merchant-decision/types/enums";
import { TrendingUp, Target } from "lucide-react";

interface Props {
  data: Opportunity[];
}

const IMPACT_BADGE: Record<ImpactLevel, string> = {
  [ImpactLevel.High]:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  [ImpactLevel.Medium]: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  [ImpactLevel.Low]:    "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const IMPACT_LABEL: Record<ImpactLevel, string> = {
  [ImpactLevel.High]:   "Alto impacto",
  [ImpactLevel.Medium]: "Médio impacto",
  [ImpactLevel.Low]:    "Baixo impacto",
};

export function OpportunitiesWidget({ data }: Props) {
  return (
    <section
      aria-label="Oportunidades Detectadas"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">Oportunidades</h2>
        </div>
        {data.length > 0 && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
            {data.length}
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Target className="h-8 w-8 text-slate-700" />
          <p className="text-sm text-slate-500">Nenhuma oportunidade detectada.</p>
          <p className="text-xs text-slate-600">
            Oportunidades aparecem quando há padrões de comportamento para explorar.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((opp) => (
            <li
              key={opp.id}
              className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-4 transition-colors hover:bg-slate-800/60"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-white">{opp.title}</p>
                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${IMPACT_BADGE[opp.impact]}`}>
                  {IMPACT_LABEL[opp.impact]}
                </span>
              </div>
              <p className="mb-2 text-xs text-slate-400">{opp.description}</p>

              {opp.evidence.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {opp.evidence.map((e, i) => (
                    <span key={i} className="rounded-lg bg-slate-900/60 px-2 py-1 text-xs text-slate-300">
                      {e.label}: <span className="font-semibold text-white">{e.value}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex gap-1.5">
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Como agir:</span>
                  <span className="text-[10px] text-slate-400">{opp.how_to_act}</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Benefício:</span>
                  <span className="text-[10px] text-slate-400">{opp.expected_benefit}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
