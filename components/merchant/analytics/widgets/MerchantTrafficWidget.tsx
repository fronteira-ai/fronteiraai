import type { TrafficAnalyticsResult } from "@/src/domains/merchant-analytics/types";
import { Globe } from "lucide-react";

interface MerchantTrafficWidgetProps {
  data: TrafficAnalyticsResult | null;
}

export function MerchantTrafficWidget({ data }: MerchantTrafficWidgetProps) {
  const sources = data?.sources.slice(0, 5) ?? [];
  const total = data?.total_visits ?? 0;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Origem do Tráfego</h3>
        <Globe className="h-4 w-4 text-slate-400" />
      </div>

      {sources.length === 0 ? (
        <p className="text-slate-500 text-sm">Sem dados de tráfego ainda</p>
      ) : (
        <div className="space-y-2">
          {sources.map((s) => (
            <div key={s.source} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">{s.source}</span>
                <span className="text-slate-400">{s.visits.toLocaleString("pt-BR")} ({s.percentage}%)</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800">
                <div
                  className="h-1.5 rounded-full bg-cyan-500/70"
                  style={{ width: `${s.percentage}%` }}
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-500 pt-1">
            Total: {total.toLocaleString("pt-BR")} eventos
          </p>
        </div>
      )}
    </div>
  );
}
