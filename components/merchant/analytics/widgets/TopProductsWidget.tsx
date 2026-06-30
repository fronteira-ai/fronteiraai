import type { ProductAnalyticsResult } from "@/src/domains/merchant-analytics/types";
import { Package, TrendingUp } from "lucide-react";

interface TopProductsWidgetProps {
  data: ProductAnalyticsResult | null;
}

export function TopProductsWidget({ data }: TopProductsWidgetProps) {
  const products = data?.products.slice(0, 5) ?? [];

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Top Produtos</h3>
        <TrendingUp className="h-4 w-4 text-slate-400" />
      </div>

      {products.length === 0 ? (
        <p className="text-slate-500 text-sm">Sem dados de produtos ainda</p>
      ) : (
        <div className="space-y-2">
          {products.map((p, i) => (
            <div
              key={p.product_id}
              className="flex items-center gap-3 rounded-lg bg-slate-800/40 p-2.5"
            >
              <span className="text-xs font-bold text-slate-500 w-4">{i + 1}</span>
              <Package className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">
                  {p.product_name ?? p.product_id.slice(0, 8) + "…"}
                </p>
                <p className="text-xs text-slate-500">
                  {p.impressions.toLocaleString("pt-BR")} impressões
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-emerald-400">{p.ctr}%</p>
                <p className="text-xs text-slate-500">CTR</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
