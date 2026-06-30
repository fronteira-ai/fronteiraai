import type { MerchantAnalyticsSummary } from "@/src/domains/merchant-analytics/types";
import { MousePointerClick, MessageCircle, Phone } from "lucide-react";

interface TrafficWidgetProps {
  data: MerchantAnalyticsSummary | null;
}

export function TrafficWidget({ data }: TrafficWidgetProps) {
  const ctrColor =
    !data ? "text-slate-400"
    : data.ctr >= 5 ? "text-emerald-400"
    : data.ctr >= 2 ? "text-amber-400"
    : "text-red-400";

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Engajamento</h3>
        <MousePointerClick className="h-4 w-4 text-slate-400" />
      </div>

      {!data ? (
        <p className="text-slate-500 text-sm">Sem dados</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className={`text-3xl font-bold ${ctrColor}`}>{data.ctr}%</p>
            <p className="text-xs text-slate-400 mt-0.5">CTR produtos</p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-lg bg-slate-800/60 p-3">
              <p className="text-lg font-semibold text-white">
                {data.product_impressions.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-slate-400">impressões</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-3">
              <p className="text-lg font-semibold text-white">
                {data.product_clicks.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-slate-400">cliques</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm pt-1">
            <div className="flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-slate-300">{data.whatsapp_clicks}</span>
              <span className="text-slate-500">WhatsApp</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-slate-300">{data.phone_clicks}</span>
              <span className="text-slate-500">Ligação</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
