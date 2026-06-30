"use client";

import { useState } from "react";
import Link from "next/link";
import type { CatalogIntelligence, CatalogIssue } from "@/src/domains/merchant-intelligence/types";
import { InsightSeverity } from "@/src/domains/merchant-intelligence/types";
import { AlertTriangle, Info, XCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface Props {
  data: CatalogIntelligence;
}

const SEVERITY_CONFIG = {
  [InsightSeverity.Critical]: {
    icon: XCircle,
    iconColor: "text-red-400",
    bg: "bg-red-900/20",
    border: "border-red-700/30",
    badge: "bg-red-900/50 text-red-400",
  },
  [InsightSeverity.Warning]: {
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    bg: "bg-amber-900/20",
    border: "border-amber-700/30",
    badge: "bg-amber-900/50 text-amber-400",
  },
  [InsightSeverity.Info]: {
    icon: Info,
    iconColor: "text-blue-400",
    bg: "bg-blue-900/20",
    border: "border-blue-700/30",
    badge: "bg-blue-900/50 text-blue-400",
  },
};

function IssueCard({ issue }: { issue: CatalogIssue }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[issue.severity];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3">
          <Icon size={16} className={`mt-0.5 shrink-0 ${cfg.iconColor}`} />
          <div>
            <p className="text-sm font-medium text-white">{issue.label}</p>
            <p className="text-xs text-slate-400">{issue.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
            {issue.count} produto{issue.count !== 1 ? "s" : ""}
          </span>
          {expanded ? (
            <ChevronUp size={14} className="text-slate-400" />
          ) : (
            <ChevronDown size={14} className="text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-slate-700/30 pt-3">
          <p className="text-xs leading-relaxed text-slate-300">
            <span className="font-medium text-slate-200">Impacto: </span>
            {issue.impact}
          </p>
          <Link
            href={issue.actionHref}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700/60 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
          >
            {issue.actionLabel}
            <ExternalLink size={11} />
          </Link>
        </div>
      )}
    </div>
  );
}

function HealthBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-blue-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="min-w-[3rem] text-right text-sm font-bold text-white">{score}%</span>
    </div>
  );
}

export function CatalogIssuesWidget({ data }: Props) {
  return (
    <section
      aria-label="Catalog Intelligence"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Inteligência de Catálogo
        </h2>
        <span className="text-xs text-slate-500">{data.totalProducts} produto(s) analisados</span>
      </div>

      {/* Health bar */}
      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-slate-400">Completude do catálogo</span>
        </div>
        <HealthBar score={data.healthScore} />
      </div>

      {/* Insights */}
      {data.insights.length > 0 && (
        <div className="mb-4 space-y-2">
          {data.insights.map((insight, i) => {
            const cfg = SEVERITY_CONFIG[insight.severity];
            const Icon = cfg.icon;
            return (
              <div key={i} className={`flex gap-2 rounded-lg border ${cfg.border} ${cfg.bg} px-3 py-2`}>
                <Icon size={14} className={`mt-0.5 shrink-0 ${cfg.iconColor}`} />
                <div>
                  <p className="text-xs font-medium text-white">{insight.message}</p>
                  <p className="text-xs text-slate-400">{insight.why}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Issues */}
      <div className="space-y-2">
        {data.issues.length === 0 ? (
          <p className="text-center text-sm text-emerald-400 py-4">
            ✓ Nenhum problema encontrado no catálogo
          </p>
        ) : (
          data.issues.map((issue) => <IssueCard key={issue.type} issue={issue} />)
        )}
      </div>
    </section>
  );
}
