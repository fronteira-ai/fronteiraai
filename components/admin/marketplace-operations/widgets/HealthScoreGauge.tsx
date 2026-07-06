import { Activity } from "lucide-react";
import type { MarketplaceHealthBreakdown } from "@/src/domains/marketplace-operations/types";

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  healthy: { color: "text-emerald-400", bg: "border-emerald-500/20 bg-emerald-500/5", label: "Saudável" },
  attention: { color: "text-amber-400", bg: "border-amber-500/20 bg-amber-500/5", label: "Atenção" },
  critical: { color: "text-red-400", bg: "border-red-500/20 bg-red-500/5", label: "Crítico" },
};

export function HealthScoreGauge({ health }: { health: MarketplaceHealthBreakdown | null }) {
  if (!health) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-500">
        Não foi possível calcular o Marketplace Health agora.
      </div>
    );
  }

  const style = STATUS_STYLE[health.status] ?? STATUS_STYLE.attention;

  return (
    <div className={`rounded-xl border p-6 ${style.bg}`}>
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide mb-2">
        <Activity className="w-3.5 h-3.5" />
        Marketplace Health
      </div>
      <div className="flex items-baseline gap-3">
        <span className={`text-5xl font-bold ${style.color}`}>{health.overallScore}</span>
        <span className="text-slate-500 text-lg">/100</span>
        <span className={`ml-auto text-sm font-medium ${style.color}`}>{style.label}</span>
      </div>
      <p className="text-slate-500 text-xs mt-2">
        Gerado em {new Date(health.generatedAt).toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
