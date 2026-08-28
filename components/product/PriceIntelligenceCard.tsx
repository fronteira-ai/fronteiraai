import { TrendingDown, TrendingUp, Minus, Info } from "lucide-react";
import { formatUSD } from "@/src/domains/exchange";
import type { ProductPriceIntelligence } from "@/services/price-intelligence.service";

type Props = {
  data: ProductPriceIntelligence | null;
};

const CLASS_LABEL: Record<string, { label: string; badge: string }> = {
  best: { label: "Ótimo preço", badge: "bg-emerald-500/20 text-emerald-300" },
  good: { label: "Bom preço", badge: "bg-green-500/20 text-green-300" },
  normal: { label: "Preço normal", badge: "bg-blue-500/20 text-blue-300" },
  high: { label: "Preço alto", badge: "bg-red-500/20 text-red-300" },
};

const TREND_ICON = { down: TrendingDown, up: TrendingUp, flat: Minus };

// Gráfico SVG leve (Design System existente): tempo X, preço Y. Mobile-first.
function Sparkline({ series, width = 560, height = 130 }: { series: { recordedAt: string; priceUSD: number }[]; width?: number; height?: number }) {
  if (series.length < 2) return null;
  const minPrice = Math.min(...series.map((p) => p.priceUSD));
  const maxPrice = Math.max(...series.map((p) => p.priceUSD));
  const range = maxPrice - minPrice || 1;
  const pad = 6;
  const n = series.length;
  const points = series.map((p, i) => {
    const x = pad + (i / (n - 1)) * (width - pad * 2);
    const y = pad + (1 - (p.priceUSD - minPrice) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const lastY = parseFloat(points[points.length - 1].split(",")[1]);
  const up = series[n - 1].priceUSD >= series[0].priceUSD;
  const stroke = up ? "#34d399" : "#f87171";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Histórico de preço">
      <polyline points={points.join(" ")} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={points[points.length - 1].split(",")[0]} cy={lastY} r={3} fill={stroke} />
    </svg>
  );
}

export default function PriceIntelligenceCard({ data }: Props) {
  if (!data) return null;
  const { result, series } = data;

  if (result.status === "insufficient") {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-slate-500" />
          <h2 className="text-lg font-bold text-white">Inteligência de preço</h2>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Ainda não há histórico suficiente para analisar este preço.
        </p>
      </section>
    );
  }

  const cls = CLASS_LABEL[result.classification!];
  const TrendIcon = TREND_ICON[result.trend!];

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-white">Inteligência de preço</h2>
        <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${cls.badge}`}>
          {cls.label}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-300">{result.message}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-xs text-slate-500">Preço atual</p>
          <p className="text-lg font-black text-white">{formatUSD(result.currentPriceUSD ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-xs text-slate-500">Menor histórico</p>
          <p className="text-lg font-black text-emerald-300">{formatUSD(result.minPriceUSD ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-xs text-slate-500">Maior histórico</p>
          <p className="text-lg font-black text-slate-300">{formatUSD(result.maxPriceUSD ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-xs text-slate-500">Tendência</p>
          <p className="flex items-center gap-1 text-lg font-black text-white">
            <TrendIcon size={16} className="text-brand-cyan" />
            {result.trend === "down" ? "em queda" : result.trend === "up" ? "em alta" : "estável"}
          </p>
        </div>
      </div>

      {result.delta7dPercent != null && (
        <p className="mt-3 text-xs text-slate-500">
          Variação 7d: {result.delta7dPercent >= 0 ? "+" : ""}
          {result.delta7dPercent.toFixed(1)}%
          {result.delta30dPercent != null ? ` · 30d: ${result.delta30dPercent >= 0 ? "+" : ""}${result.delta30dPercent.toFixed(1)}%` : ""}
        </p>
      )}

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
        <p className="mb-2 text-xs text-slate-500">Histórico de preços</p>
        <Sparkline series={series} />
      </div>
    </section>
  );
}
