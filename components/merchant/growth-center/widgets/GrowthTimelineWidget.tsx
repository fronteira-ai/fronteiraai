import type { GrowthHistoryEntry } from "@/src/domains/growth-engine/types/growth.types";
import { GrowthEventType } from "@/src/domains/growth-engine/types/enums";
import { History, Eye, CheckCircle2, XCircle, Star } from "lucide-react";

interface Props {
  data: GrowthHistoryEntry[];
}

const EVENT_ICON: Record<GrowthEventType, typeof Eye> = {
  [GrowthEventType.Viewed]:    Eye,
  [GrowthEventType.Accepted]:  CheckCircle2,
  [GrowthEventType.Ignored]:   XCircle,
  [GrowthEventType.Completed]: Star,
};

const EVENT_COLORS: Record<GrowthEventType, string> = {
  [GrowthEventType.Completed]: "text-emerald-400",
  [GrowthEventType.Accepted]:  "text-cyan-400",
  [GrowthEventType.Viewed]:    "text-slate-400",
  [GrowthEventType.Ignored]:   "text-slate-600",
};

const EVENT_LABELS: Record<GrowthEventType, string> = {
  [GrowthEventType.Completed]: "Concluído",
  [GrowthEventType.Accepted]:  "Aceito",
  [GrowthEventType.Viewed]:    "Visualizado",
  [GrowthEventType.Ignored]:   "Ignorado",
};

function relativeTime(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 2) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export function GrowthTimelineWidget({ data }: Props) {
  return (
    <section
      aria-label="Histórico de Crescimento"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center gap-2">
        <History className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-white">Histórico de Crescimento</h2>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <History className="h-8 w-8 text-slate-600" />
          <p className="text-sm font-medium text-white">Sem histórico ainda</p>
          <p className="text-xs text-slate-500">Interaja com as recomendações para criar um histórico.</p>
        </div>
      ) : (
        <ol className="relative space-y-3 border-l border-slate-700/50 pl-4">
          {data.slice(0, 12).map((entry) => {
            const Icon = EVENT_ICON[entry.event_type];
            return (
              <li key={entry.id} className="relative">
                <div className={`absolute -left-[18px] top-0 ${EVENT_COLORS[entry.event_type]}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-white">{entry.title}</p>
                    <p className="text-[10px] text-slate-500 capitalize">
                      {EVENT_LABELS[entry.event_type]} · {entry.category}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-600">{relativeTime(entry.occurred_at)}</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
