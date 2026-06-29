import type { MerchantInsights, ReviewStats } from "../types/trust.types";

interface MetricProps {
  label: string;
  value: string | number;
  sub?: string;
}

function Metric({ label, value, sub }: MetricProps) {
  return (
    <div className="rounded-lg bg-slate-800/40 border border-slate-700/40 px-4 py-3 text-center">
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

interface Props {
  insights: MerchantInsights;
  reviewStats: ReviewStats;
}

export function MerchantMetrics({ insights, reviewStats }: Props) {
  const ratingDisplay = reviewStats.average != null
    ? reviewStats.average.toFixed(1)
    : "—";

  const ageYears = insights.platformAgeInDays >= 365
    ? `${Math.floor(insights.platformAgeInDays / 365)}a`
    : `${insights.platformAgeInDays}d`;

  return (
    <section aria-labelledby="metrics-heading">
      <h2 id="metrics-heading" className="text-sm font-semibold text-white mb-3">
        Métricas
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
        <Metric
          label="Na plataforma"
          value={ageYears}
        />
        <Metric
          label="Verificações"
          value={insights.verificationCount}
        />
        <Metric
          label="Avaliações"
          value={insights.reviewCount}
        />
        <Metric
          label="Nota média"
          value={ratingDisplay}
          sub={ratingDisplay !== "—" ? "de 5" : undefined}
        />
      </div>
    </section>
  );
}
