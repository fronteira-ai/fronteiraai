"use client";

import { useState } from "react";
import type { GrowthRecommendation } from "@/src/domains/growth-engine/types/growth.types";
import { GrowthPriority, GrowthEffort, GrowthEventType } from "@/src/domains/growth-engine/types/enums";
import { Target, ChevronDown, ChevronUp, CheckCircle2, EyeOff, Clock } from "lucide-react";

interface Props {
  data: GrowthRecommendation[];
}

const PRIORITY_COLORS: Record<GrowthPriority, string> = {
  [GrowthPriority.Critical]: "border-l-red-500",
  [GrowthPriority.High]:     "border-l-amber-500",
  [GrowthPriority.Medium]:   "border-l-blue-500",
  [GrowthPriority.Low]:      "border-l-slate-500",
};

const PRIORITY_LABELS: Record<GrowthPriority, string> = {
  [GrowthPriority.Critical]: "Crítica",
  [GrowthPriority.High]:     "Alta",
  [GrowthPriority.Medium]:   "Média",
  [GrowthPriority.Low]:      "Baixa",
};

const EFFORT_LABELS: Record<GrowthEffort, string> = {
  [GrowthEffort.Minutes]: "minutos",
  [GrowthEffort.Hours]:   "horas",
  [GrowthEffort.Days]:    "dias",
};

async function recordEvent(id: string, eventType: GrowthEventType): Promise<void> {
  await fetch(`/api/merchant/growth/recommendations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: eventType }),
  }).catch(() => undefined);
}

export function HighImpactActionsWidget({ data }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  const visible = data.filter((r) => !dismissed.has(r.id)).slice(0, 10);

  function toggle(id: string) {
    if (expanded !== id) {
      recordEvent(id, GrowthEventType.Viewed);
    }
    setExpanded((prev) => (prev === id ? null : id));
  }

  function accept(id: string) {
    recordEvent(id, GrowthEventType.Accepted);
    setAccepted((prev) => new Set(prev).add(id));
  }

  function dismiss(id: string) {
    recordEvent(id, GrowthEventType.Ignored);
    setDismissed((prev) => new Set(prev).add(id));
    if (expanded === id) setExpanded(null);
  }

  return (
    <section
      aria-label="Ações de Alto Impacto"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white">Todas as Recomendações</h2>
        </div>
        <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-400">
          {visible.length} ações
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          <p className="text-sm font-medium text-white">Parabéns! Você revisou tudo.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((rec) => {
            const isExpanded = expanded === rec.id;
            const isAccepted = accepted.has(rec.id);

            return (
              <li
                key={rec.id}
                className={`rounded-xl border border-l-4 border-slate-700/40 bg-slate-800/40 transition-colors ${PRIORITY_COLORS[rec.priority]}`}
              >
                <button
                  onClick={() => toggle(rec.id)}
                  className="flex w-full items-start gap-3 p-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{rec.title}</p>
                      {isAccepted && (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                      <span>{PRIORITY_LABELS[rec.priority]}</span>
                      <span>·</span>
                      <Clock className="h-2.5 w-2.5" />
                      <span>{rec.estimated_minutes} {EFFORT_LABELS[rec.estimated_effort]}</span>
                      <span>·</span>
                      <span>Score {rec.priority_score}/100</span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-700/40 px-3 pb-3 pt-2">
                    <p className="mb-2 text-xs text-slate-300">{rec.description}</p>
                    <p className="mb-3 text-xs text-slate-400">{rec.explanation}</p>

                    <div className="mb-3 rounded-lg border border-slate-700/40 bg-slate-900/40 p-2">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Por que esta ação?</p>
                      <p className="text-[11px] text-slate-300">{rec.priority_breakdown.reason}</p>
                    </div>

                    {rec.evidence.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Evidências</p>
                        <ul className="space-y-0.5">
                          {rec.evidence.map((ev, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-slate-400">
                              <span className="h-1 w-1 rounded-full bg-slate-500" />
                              {ev.label}: <span className="font-medium text-slate-200">{ev.value}{ev.unit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Impacto esperado</p>
                      <p className="text-xs text-emerald-300">{rec.expected_impact}</p>
                    </div>

                    <div className="flex gap-2">
                      {!isAccepted ? (
                        <button
                          onClick={() => accept(rec.id)}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Aceitar
                        </button>
                      ) : (
                        <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Aceito
                        </span>
                      )}
                      {rec.action_url && (
                        <a
                          href={rec.action_url}
                          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-600"
                        >
                          {rec.action_label}
                        </a>
                      )}
                      <button
                        onClick={() => dismiss(rec.id)}
                        className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] text-slate-500 transition-colors hover:text-slate-400"
                      >
                        <EyeOff className="h-3 w-3" />
                        Ignorar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
