import { Store, Tag, Box, TrendingUp } from "lucide-react";
import type { HomeStats } from "@/lib/home-premium-service";

// Release 1.9 — Program F — Wave 2 (v0 realignment). Same real counts as the
// old inline stat row (MarketplaceMetricsService via getHomeStats) — only the
// presentation changed, from four wide StatCards to the v0 stacked glass card.
export default function HeroStats({ stats }: { stats: HomeStats }) {
  const rows = [
    { icon: Store, value: `+${stats.stores.toLocaleString("pt-BR")}`, label: "Lojas parceiras", iconClass: "text-brand-blue bg-brand-blue/10" },
    { icon: Tag, value: `+${stats.offers.toLocaleString("pt-BR")}`, label: "Ofertas ativas", iconClass: "text-brand-purple bg-brand-purple/10" },
    { icon: Box, value: `+${stats.products.toLocaleString("pt-BR")}`, label: "Produtos cadastrados", iconClass: "text-positive bg-positive/10" },
    { icon: TrendingUp, value: "Economia", label: "Garanta sempre o melhor preço", iconClass: "text-amber bg-amber/10", valueClass: "text-amber" },
  ];

  return (
    <div className="glass-card divide-y divide-white/10 rounded-2xl">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 px-4 py-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${r.iconClass}`}>
            <r.icon size={18} />
          </span>
          <div className="min-w-0">
            <p className={`font-home-display text-lg font-bold leading-none text-white ${r.valueClass ?? ""}`}>
              {r.value}
            </p>
            <p className="mt-1 text-[12.5px] leading-tight text-slate-400">{r.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
