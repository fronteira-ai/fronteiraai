"use client";

import { useState } from "react";
import type { Recommendation } from "@/src/domains/merchant-decision/types/decision.types";
import {
  RecommendationPriority,
  RecommendationCategory,
  EstimatedEffort,
} from "@/src/domains/merchant-decision/types/enums";
import { Lightbulb, ChevronDown, ChevronUp, CheckCircle, X, ExternalLink } from "lucide-react";

interface Props {
  data: Recommendation[];
  onAccept: (rec: Recommendation) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
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

const EFFORT_LABEL: Record<EstimatedEffort, string> = {
  [EstimatedEffort.Minutes]: "min",
  [EstimatedEffort.Hours]:   "h",
  [EstimatedEffort.Days]:    "d",
};

function RecommendationCard({
  rec,
  onAccept,
  onDismiss,
}: {
  rec: Recommendation;
  onAccept: (r: Recommendation) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleAccept() {
    setBusy(true);
    await onAccept(rec);
    setBusy(false);
  }

  async function handleDismiss() {
    setBusy(true);
    await onDismiss(rec.id);
    setBusy(false);
  }

  return (
    <li className="rounded-xl border border-slate-700/40 bg-slate-800/40 transition-colors hover:bg-slate-800/60">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE[rec.priority]}`}>
                {PRIORITY_LABEL[rec.priority]}
              </span>
              <span className="text-[10px] text-slate-500">{CATEGORY_LABEL[rec.category]}</span>
            </div>
            <p className="text-sm font-semibold text-white">{rec.title}</p>
            <p className="mt-0.5 text-xs text-slate-400">{rec.description}</p>
          </div>
          <button
            onClick={() => setExpanded((p) => !p)}
            className="ml-2 shrink-0 text-slate-500 transition-colors hover:text-white"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-3 space-y-3">
            <div className="rounded-lg bg-slate-900/60 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Motivo</p>
              <p className="text-xs text-slate-300">{rec.reason}</p>
            </div>

            {rec.evidence.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Evidências</p>
                <ul className="space-y-1">
                  {rec.evidence.map((e, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg bg-slate-900/40 px-3 py-1.5">
                      <span className="text-xs text-slate-400">{e.label}</span>
                      <span className="ml-2 text-xs font-semibold text-white">{e.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>Impacto esperado: <span className="text-slate-300">{rec.expected_impact}</span></span>
              <span>·</span>
              <span>{rec.estimated_minutes} {EFFORT_LABEL[rec.estimated_effort]}</span>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          {rec.action_url && (
            <a
              href={rec.action_url}
              className="flex items-center gap-1 rounded-lg bg-emerald-600/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-600/20"
            >
              <ExternalLink className="h-3 w-3" />
              {rec.action_label ?? "Resolver"}
            </a>
          )}
          <button
            onClick={handleAccept}
            disabled={busy}
            className="flex items-center gap-1 rounded-lg bg-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            <CheckCircle className="h-3 w-3 text-emerald-400" />
            Concluída
          </button>
          <button
            onClick={handleDismiss}
            disabled={busy}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300 disabled:opacity-50"
          >
            <X className="h-3 w-3" />
            Ignorar
          </button>
        </div>
      </div>
    </li>
  );
}

export function RecommendationsWidget({ data, onAccept, onDismiss }: Props) {
  return (
    <section
      aria-label="Recomendações"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Recomendações</h2>
        </div>
        {data.length > 0 && (
          <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-400">
            {data.length}
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Lightbulb className="h-8 w-8 text-slate-700" />
          <p className="text-sm text-slate-500">Nenhuma recomendação no momento.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} onAccept={onAccept} onDismiss={onDismiss} />
          ))}
        </ul>
      )}
    </section>
  );
}
