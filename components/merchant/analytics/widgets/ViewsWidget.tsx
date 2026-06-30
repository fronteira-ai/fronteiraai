import type { MerchantAnalyticsSummary } from "@/src/domains/merchant-analytics/types";
import { Eye, Users } from "lucide-react";

interface ViewsWidgetProps {
  data: MerchantAnalyticsSummary | null;
}

export function ViewsWidget({ data }: ViewsWidgetProps) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Visitas</h3>
        <Eye className="h-4 w-4 text-slate-400" />
      </div>

      {!data ? (
        <p className="text-slate-500 text-sm">Sem dados</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-3xl font-bold text-white">{data.views.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-slate-400 mt-0.5">visualizações de perfil</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-300">{data.unique_visitors.toLocaleString("pt-BR")}</span>
            <span className="text-slate-500">visitantes únicos</span>
          </div>
        </div>
      )}
    </div>
  );
}
