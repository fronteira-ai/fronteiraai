import type { FunnelResult } from "@/src/domains/merchant-analytics/types";
import { Filter } from "lucide-react";

interface FunnelWidgetProps {
  data: FunnelResult | null;
}

export function FunnelWidget({ data }: FunnelWidgetProps) {
  const steps = data?.steps ?? [];
  const maxCount = steps.reduce((m, s) => Math.max(m, s.count), 1);

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Funil de Conversão</h3>
        <Filter className="h-4 w-4 text-slate-400" />
      </div>

      {steps.length === 0 ? (
        <p className="text-slate-500 text-sm">Sem dados de funil ainda</p>
      ) : (
        <div className="space-y-2">
          {steps.map((step) => (
            <div key={step.step} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">{step.label}</span>
                <span className="text-slate-400">{step.count.toLocaleString("pt-BR")}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800">
                <div
                  className="h-1.5 rounded-full bg-blue-500/70"
                  style={{ width: `${maxCount > 0 ? (step.count / maxCount) * 100 : 0}%` }}
                />
              </div>
              {step.drop_rate !== null && (
                <p className="text-xs text-slate-500">
                  -{step.drop_rate}% drop do passo anterior
                </p>
              )}
            </div>
          ))}

          {data && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <p className="text-xs text-slate-400">
                Conversão geral:{" "}
                <span className="font-semibold text-emerald-400">
                  {data.overall_conversion}%
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
