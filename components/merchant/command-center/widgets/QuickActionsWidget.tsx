import Link from "next/link";
import type { QuickActionsResult, QuickAction } from "@/src/domains/merchant-intelligence/types";
import { ActionPriority } from "@/src/domains/merchant-intelligence/types";
import {
  AlertCircle,
  ArrowUpCircle,
  Circle,
  ChevronRight,
  Clock,
} from "lucide-react";

interface Props {
  data: QuickActionsResult;
}

const PRIORITY_CONFIG: Record<
  ActionPriority,
  { label: string; icon: typeof AlertCircle; iconColor: string; border: string; bg: string; badgeBg: string; badgeText: string }
> = {
  [ActionPriority.Critical]: {
    label: "Crítico",
    icon: AlertCircle,
    iconColor: "text-red-400",
    border: "border-red-700/40",
    bg: "bg-red-900/15",
    badgeBg: "bg-red-900/50",
    badgeText: "text-red-400",
  },
  [ActionPriority.High]: {
    label: "Alto",
    icon: ArrowUpCircle,
    iconColor: "text-amber-400",
    border: "border-amber-700/40",
    bg: "bg-amber-900/15",
    badgeBg: "bg-amber-900/50",
    badgeText: "text-amber-400",
  },
  [ActionPriority.Medium]: {
    label: "Médio",
    icon: Circle,
    iconColor: "text-blue-400",
    border: "border-blue-700/40",
    bg: "bg-blue-900/15",
    badgeBg: "bg-blue-900/50",
    badgeText: "text-blue-400",
  },
  [ActionPriority.Low]: {
    label: "Baixo",
    icon: Circle,
    iconColor: "text-slate-400",
    border: "border-slate-700/40",
    bg: "bg-slate-800/30",
    badgeBg: "bg-slate-700/50",
    badgeText: "text-slate-400",
  },
};

function ActionCard({ action }: { action: QuickAction }) {
  const cfg = PRIORITY_CONFIG[action.priority];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
      <div className="flex items-start gap-3">
        <Icon size={16} className={`mt-0.5 shrink-0 ${cfg.iconColor}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-white">{action.title}</span>
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cfg.badgeBg} ${cfg.badgeText}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-2">{action.description}</p>
          <p className="text-xs text-slate-300 mb-3">
            <span className="font-medium text-slate-200">Impacto: </span>
            {action.impact}
          </p>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Link
              href={action.href}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-700/70 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600 transition-colors"
            >
              Resolver agora
              <ChevronRight size={11} />
            </Link>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock size={11} />
              ~{action.estimatedMinutes} min
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuickActionsWidget({ data }: Props) {
  const criticalCount = data.actions.filter((a) => a.priority === ActionPriority.Critical).length;

  return (
    <section
      aria-label="Ações Rápidas"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Ações Rápidas
        </h2>
        {criticalCount > 0 && (
          <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-xs font-medium text-red-400">
            {criticalCount} crítica{criticalCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {data.actions.length === 0 ? (
        <p className="py-6 text-center text-sm text-emerald-400">
          ✓ Nenhuma ação necessária no momento
        </p>
      ) : (
        <div className="space-y-3">
          {data.actions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>
      )}
    </section>
  );
}
