import { ArrowLeftRight, ArrowDown, ArrowUp } from "lucide-react";
import DashboardCardShell from "./DashboardCardShell";
import Sparkline from "@/components/ui/Sparkline";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getExchangeSnapshot, type ExchangeRatePoint } from "@/lib/home-premium-service";
import { formatTimestamp } from "@/src/domains/exchange";

/** Real percent change from the first to the last point of the actual
 * history window — never fabricated, `null` when there isn't enough
 * history to compare (mirrors Sparkline.tsx's own "not enough data" rule). */
function percentChange(history: ExchangeRatePoint[]): number | null {
  if (history.length < 2) return null;
  const first = history[0].rate;
  const last = history[history.length - 1].rate;
  if (!first) return null;
  return ((last - first) / first) * 100;
}

function Rate({
  label,
  current,
  history,
}: {
  label: string;
  current: { rate: number; capturedAt: string } | null;
  history: ExchangeRatePoint[];
}) {
  const pct = percentChange(history);
  const up = (pct ?? 0) >= 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="font-home-display text-3xl font-bold text-white">
          {current ? current.rate.toFixed(2) : "—"}
        </p>
        {pct !== null ? (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? "text-positive" : "text-negative"}`}>
            {pct > 0 ? "+" : ""}
            {pct.toFixed(2)}%
            {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          </span>
        ) : null}
      </div>
      <div className="mt-3">
        <Sparkline values={history.map((h) => h.rate)} color={up ? "var(--color-positive)" : "var(--color-negative)"} />
      </div>
    </div>
  );
}

// Release 1.9 — Program F — Wave 2 (v0 realignment). The v0 ExchangeCard
// shows two rate columns; the real domain has exactly two currency pairs
// (UsdBrl, UsdPyg) — extended getExchangeSnapshot() to fetch history for
// both symmetrically instead of inventing a second "BRL" rate.
export default async function CambioCard() {
  const client = getSupabaseServiceClient();
  const { usdBrl, usdPyg, history, usdPygHistory, usingFallback } = await getExchangeSnapshot(client);

  return (
    <DashboardCardShell icon={<ArrowLeftRight size={16} />} title="Câmbio ao vivo">
      {!usdBrl && !usdPyg ? (
        <p className="text-sm text-slate-500">Cotação em sincronização.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Rate label="USD → BRL" current={usdBrl} history={history} />
            <Rate label="USD → PYG" current={usdPyg} history={usdPygHistory} />
          </div>
          <div className={`mt-4 flex items-center gap-2 text-xs ${usingFallback ? "text-amber-400" : "text-slate-500"}`}>
            {!usingFallback ? (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
              </span>
            ) : null}
            {formatTimestamp((usdBrl ?? usdPyg)!.capturedAt, usingFallback)}
          </div>
        </>
      )}
    </DashboardCardShell>
  );
}
