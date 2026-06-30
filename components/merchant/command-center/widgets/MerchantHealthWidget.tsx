import type { MerchantHealth, HealthDimensionResult } from "@/src/domains/merchant-intelligence/types";
import { HealthStatus } from "@/src/domains/merchant-intelligence/types";
import { ChevronRight } from "lucide-react";

interface Props {
  data: MerchantHealth;
}

const STATUS_STYLES: Record<HealthStatus, { bg: string; text: string; dot: string; border: string }> = {
  [HealthStatus.Excellent]: {
    bg: "bg-emerald-900/30",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    border: "border-emerald-700/40",
  },
  [HealthStatus.Good]: {
    bg: "bg-blue-900/30",
    text: "text-blue-400",
    dot: "bg-blue-400",
    border: "border-blue-700/40",
  },
  [HealthStatus.Regular]: {
    bg: "bg-amber-900/30",
    text: "text-amber-400",
    dot: "bg-amber-400",
    border: "border-amber-700/40",
  },
  [HealthStatus.Attention]: {
    bg: "bg-red-900/30",
    text: "text-red-400",
    dot: "bg-red-400",
    border: "border-red-700/40",
  },
};

function DimensionCard({ dim }: { dim: HealthDimensionResult }) {
  const styles = STATUS_STYLES[dim.status];

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border ${styles.border} ${styles.bg} p-4 transition-all duration-200`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{dim.icon}</span>
          <span className="text-sm font-semibold text-white">{dim.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${styles.dot}`} />
          <span className={`text-xs font-medium ${styles.text}`}>{dim.statusLabel}</span>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-slate-300">{dim.reason}</p>

      {dim.howToImprove && (
        <p className="flex items-start gap-1 text-xs text-slate-400">
          <ChevronRight size={12} className="mt-0.5 shrink-0 text-slate-500" />
          {dim.howToImprove}
        </p>
      )}
    </div>
  );
}

export function MerchantHealthWidget({ data }: Props) {
  return (
    <section
      aria-label="Merchant Health"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Saúde da Loja
        </h2>
        {data.overallAttentionCount > 0 && (
          <span className="rounded-full bg-red-900/50 px-2 py-0.5 text-xs font-medium text-red-400">
            {data.overallAttentionCount} dimensão(ões) precisam de atenção
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.dimensions.map((dim) => (
          <DimensionCard key={dim.dimension} dim={dim} />
        ))}
      </div>
    </section>
  );
}
