import { Radio } from "lucide-react";
import DashboardCardShell from "./DashboardCardShell";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getLiveMarketplaceFeed } from "@/lib/home-premium-service";

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  return `há ${Math.round(minutes / 60)}h`;
}

const CARD_LIMIT = 4;

// Compact strip version of LiveMarketplace.tsx — same
// MarketPulseService.getTopMovers source, trimmed to fit the dense layout.
export default async function LiveMarketplaceCard() {
  const client = getSupabaseServiceClient();
  const feed = (await getLiveMarketplaceFeed(client)).slice(0, CARD_LIMIT);

  return (
    <DashboardCardShell icon={<Radio size={16} />} title="Live Marketplace" badge="Ao vivo">
      {feed.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma atualização nas últimas 24h.</p>
      ) : (
        <ul className="space-y-3">
          {feed.map((entry, i) => (
            <li key={`${entry.productName}-${i}`} className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{entry.productName}</p>
                <p className="text-slate-500">
                  {entry.storeName ?? "Loja parceira"} · {timeAgo(entry.occurredAt)}
                </p>
              </div>
              {entry.newPriceUSD ? (
                <span className="shrink-0 font-bold text-blue-300">US$ {entry.newPriceUSD}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </DashboardCardShell>
  );
}
