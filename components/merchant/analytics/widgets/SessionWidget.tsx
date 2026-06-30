import type { MerchantAnalyticsSummary } from "@/src/domains/merchant-analytics/types";
import { Bookmark, Heart } from "lucide-react";

interface SessionWidgetProps {
  data: MerchantAnalyticsSummary | null;
}

export function SessionWidget({ data }: SessionWidgetProps) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Conversões</h3>
        <Heart className="h-4 w-4 text-slate-400" />
      </div>

      {!data ? (
        <p className="text-slate-500 text-sm">Sem dados</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-800/60 p-3">
              <p className="text-xl font-bold text-white">
                {data.contact_clicks.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-slate-400">contatos iniciados</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 p-3">
              <div className="flex items-center gap-1">
                <Bookmark className="h-3.5 w-3.5 text-amber-400" />
                <p className="text-xl font-bold text-white">
                  {data.offer_saves.toLocaleString("pt-BR")}
                </p>
              </div>
              <p className="text-xs text-slate-400">ofertas salvas</p>
            </div>
          </div>

          <div className="text-xs text-slate-500 space-y-1 pt-1">
            <div className="flex justify-between">
              <span>WhatsApp</span>
              <span className="text-slate-300">{data.whatsapp_clicks}</span>
            </div>
            <div className="flex justify-between">
              <span>Telefone</span>
              <span className="text-slate-300">{data.phone_clicks}</span>
            </div>
            <div className="flex justify-between">
              <span>Site</span>
              <span className="text-slate-300">{data.website_clicks}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
