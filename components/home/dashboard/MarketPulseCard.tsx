import { Activity, TrendingDown, TrendingUp, Sparkles } from "lucide-react";
import DashboardCardShell from "./DashboardCardShell";
import Sparkline from "@/components/ui/Sparkline";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getMarketPulseHighlights } from "@/lib/home-premium-service";

// Compact strip version — real counts scoped to the last 24h
// (MarketPulseService.computeForRange, realtime-commerce), plus a real
// 7-day sparkline of price-change volume. No fabricated numbers: when a
// count is genuinely zero (e.g. no price drops recorded yet), it shows 0,
// not a placeholder.
export default async function MarketPulseCard() {
  const client = getSupabaseServiceClient();
  const { dropsCountToday, gainsCountToday, newProductsToday, recentlyUpdatedCount, dailyChangeSeries } =
    await getMarketPulseHighlights(client);

  const rows = [
    { icon: TrendingDown, color: "text-emerald-400", label: "Quedas de preços", value: dropsCountToday, suffix: "produtos" },
    { icon: TrendingUp, color: "text-red-400", label: "Maiores altas", value: gainsCountToday, suffix: "produtos" },
    { icon: Sparkles, color: "text-blue-400", label: "Novos produtos", value: newProductsToday, suffix: "hoje" },
    { icon: Activity, color: "text-cyan-400", label: "Atualizações agora", value: recentlyUpdatedCount, suffix: "produtos" },
  ];

  return (
    <DashboardCardShell icon={<Activity size={16} />} title="Market Pulse" badge="Em tempo real">
      <div className="space-y-3">
        {rows.map(({ icon: Icon, color, label, value, suffix }) => (
          <div key={label} className="flex items-center justify-between gap-2 text-sm">
            <span className={`flex items-center gap-2 ${color}`}>
              <Icon size={14} />
              <span className="text-slate-300">{label}</span>
            </span>
            <span className="font-bold text-white">
              {value.toLocaleString("pt-BR")} <span className="text-xs font-normal text-slate-500">{suffix}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Sparkline values={dailyChangeSeries} />
      </div>
    </DashboardCardShell>
  );
}
