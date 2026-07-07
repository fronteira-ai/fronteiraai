import { Activity, ArrowDown, ArrowUp } from "lucide-react";
import DashboardCardShell from "./DashboardCardShell";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getMarketPulseHighlights, type MarketMoverHighlight } from "@/lib/home-premium-service";

// Release 1.9 — Program F — Wave 2 (v0 realignment). The v0 card shows two
// ranked "maiores quedas/altas" lists — real data was already computed by
// getMarketPulseHighlights() (topDrops/topGains, 7-day MarketPulseService
// window) but the old compact card only surfaced the aggregate counts. This
// is a genuine integration, not a re-skin: when a column is empty, it says
// so honestly instead of falling back to placeholder rows.
function Column({ title, up, movers }: { title: string; up: boolean; movers: MarketMoverHighlight[] }) {
  const tone = up ? "text-negative border-negative/20 bg-negative/5" : "text-positive border-positive/20 bg-positive/5";
  const borderTone = up ? "border-negative/15" : "border-positive/15";

  return (
    <div className={`flex flex-col rounded-2xl border px-3 py-3.5 ${tone}`}>
      <div className={`mb-3.5 flex items-center gap-1.5 border-b pb-2.5 ${borderTone}`}>
        {up ? <ArrowUp size={16} className="shrink-0" /> : <ArrowDown size={16} className="shrink-0" />}
        <p className="text-[11px] font-semibold uppercase tracking-wide">{title}</p>
      </div>
      {movers.length === 0 ? (
        <p className="flex-1 text-[13px] text-slate-500">Nenhuma variação nos últimos 7 dias.</p>
      ) : (
        <ul className="flex flex-1 flex-col justify-around gap-3">
          {movers.slice(0, 3).map((m, i) => (
            <li key={`${m.productName}-${i}`} className="flex items-center gap-1.5">
              <span className="shrink-0">{up ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</span>
              <span className="flex-1 truncate text-[13px] text-white">{m.productName}</span>
              <span className="shrink-0 pl-1 text-[13px] font-semibold">
                {m.percentChange > 0 ? "+" : ""}
                {m.percentChange.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function MarketPulseCard() {
  const client = getSupabaseServiceClient();
  const { topDrops, topGains } = await getMarketPulseHighlights(client);

  return (
    <DashboardCardShell icon={<Activity size={16} />} title="Market Pulse" badge="Em tempo real">
      <div className="grid h-full grid-cols-2 gap-3">
        <Column title="Maiores quedas" up={false} movers={topDrops} />
        <Column title="Maiores altas" up={true} movers={topGains} />
      </div>
    </DashboardCardShell>
  );
}
