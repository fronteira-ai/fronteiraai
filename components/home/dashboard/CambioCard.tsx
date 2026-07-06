import { ArrowLeftRight } from "lucide-react";
import DashboardCardShell from "./DashboardCardShell";
import Sparkline from "@/components/ui/Sparkline";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getExchangeSnapshot } from "@/lib/home-premium-service";

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  return `há ${Math.round(minutes / 60)}h`;
}

// Compact strip version of CambioAoVivo.tsx — same AutomaticCurrencyService/
// ExchangeRateService/ExchangeHistoryService (exchange, Program A — Wave 1),
// with a real sparkline built from `history` (only rendered when 2+ real
// points exist — see Sparkline.tsx).
export default async function CambioCard() {
  const client = getSupabaseServiceClient();
  const { usdBrl, history } = await getExchangeSnapshot(client);

  return (
    <DashboardCardShell icon={<ArrowLeftRight size={16} />} title="Câmbio ao vivo">
      {!usdBrl ? (
        <p className="text-sm text-slate-500">Cotação em sincronização.</p>
      ) : (
        <div>
          <p className="text-xs text-slate-500">Dólar Comercial</p>
          <p className="mt-1 text-2xl font-black text-white">
            USD → BRL <span className="text-lg">R$ {usdBrl.rate.toFixed(2)}</span>
          </p>
          <div className="mt-3">
            <Sparkline values={history.map((h) => h.rate)} />
          </div>
          <p className="mt-2 text-xs text-slate-500">Atualizado {timeAgo(usdBrl.capturedAt)}</p>
        </div>
      )}
    </DashboardCardShell>
  );
}
