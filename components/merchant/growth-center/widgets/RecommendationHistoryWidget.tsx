import type { GrowthHistoryEntry } from "@/src/domains/growth-engine/types/growth.types";
import { GrowthEventType } from "@/src/domains/growth-engine/types/enums";
import { BarChart2 } from "lucide-react";

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

export function RecommendationHistoryWidget({ data }: Props) {
  const viewedCount = data.filter((e) => e.event_type === GrowthEventType.Viewed).length;
  const acceptedCount = data.filter((e) => e.event_type === GrowthEventType.Accepted).length;
  const completedCount = data.filter((e) => e.event_type === GrowthEventType.Completed).length;
  const ignoredCount = data.filter((e) => e.event_type === GrowthEventType.Ignored).length;

  const total = data.length;

  return (
    <section
      aria-label="Histórico de Recomendações"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center gap-2">
        <BarChart2 className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-white">Engajamento com Recomendações</h2>
      </div>

      {total === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">
          Nenhuma interação com recomendações ainda.
        </p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-4 gap-2">
            {[
              { label: "Vistas",     count: viewedCount,    color: "text-slate-300" },
              { label: "Aceitas",    count: acceptedCount,  color: "text-cyan-400" },
              { label: "Concluídas", count: completedCount, color: "text-emerald-400" },
              { label: "Ignoradas",  count: ignoredCount,   color: "text-slate-500" },
            ].map(({ label, count, color }) => (
              <div key={label} className="rounded-lg border border-slate-700/40 bg-slate-800/40 p-2 text-center">
                <p className={`text-lg font-bold ${color}`}>{count}</p>
                <p className="text-[10px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <ul className="space-y-1">
            {data.slice(0, 6).map((entry) => (
              <li key={entry.id} className="flex items-center gap-2 py-1 text-xs">
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                    entry.event_type === GrowthEventType.Completed ? "bg-emerald-400" :
                    entry.event_type === GrowthEventType.Accepted  ? "bg-cyan-400" :
                    entry.event_type === GrowthEventType.Ignored   ? "bg-slate-600" :
                    "bg-slate-500"
                  }`}
                />
                <span className="min-w-0 flex-1 truncate text-slate-400">{entry.title}</span>
                <span className="shrink-0 text-[10px] text-slate-600">{relativeTime(entry.occurred_at)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
