import type { LiveActivityEntry } from "@/src/domains/realtime-commerce";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "agora mesmo";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min atrás`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h atrás`;
  return `${Math.round(seconds / 86400)} d atrás`;
}

export function LiveActivityFeed({ entries }: { entries: LiveActivityEntry[] | null }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-500">
        Nenhuma atividade recente na última hora.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
      {entries.map((entry, i) => (
        <div key={`${entry.storeId}-${entry.changeType}-${i}`} className="flex items-center justify-between p-4">
          <div>
            <p className="text-white text-sm font-medium">{entry.storeName}</p>
            <p className="text-slate-400 text-xs mt-0.5">
              {entry.summary}
              {entry.count > 1 ? ` · ${entry.count}` : ""}
              {entry.sampleProductName ? ` · ${entry.sampleProductName}` : ""}
            </p>
          </div>
          <span className="text-slate-600 text-xs shrink-0">{timeAgo(entry.occurredAt)}</span>
        </div>
      ))}
    </div>
  );
}
