import type { GrowthHistoryEntry } from "@/src/domains/growth-engine/types/growth.types";
import { GrowthEventType } from "@/src/domains/growth-engine/types/enums";
import { CheckCircle2, TrendingUp } from "lucide-react";

interface Props {
  data: GrowthHistoryEntry[];
}

function relativeTime(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 2) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export function CompletedGrowthWidget({ data }: Props) {
  const completed = data.filter((e) => e.event_type === GrowthEventType.Completed);

  return (
    <section
      aria-label="Melhorias Concluídas"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">Melhorias Concluídas</h2>
        </div>
        {completed.length > 0 && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
            {completed.length}
          </span>
        )}
      </div>

      {completed.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-white">Nenhuma conclusão ainda</p>
          <p className="text-xs text-slate-500">Aceite e execute recomendações para acumular melhorias.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {completed.slice(0, 8).map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-slate-800/40 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">{entry.title}</p>
                <p className="text-[10px] text-slate-500 capitalize">{entry.category}</p>
              </div>
              <span className="shrink-0 text-[10px] text-slate-600">{relativeTime(entry.occurred_at)}</span>
            </li>
          ))}
        </ul>
      )}

      {completed.length > 8 && (
        <p className="mt-3 text-center text-[10px] text-slate-600">
          +{completed.length - 8} outras melhorias concluídas
        </p>
      )}
    </section>
  );
}
