import Link from "next/link";
import { Zap } from "lucide-react";
import DashboardCardShell from "./DashboardCardShell";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getFlashOffers } from "@/lib/home-premium-service";

const CARD_LIMIT = 4;

// Compact strip version of the flash offers concept — same
// PriceIntelligenceService.getSavingsOpportunity computation as
// EconomiaDoDia.tsx/FlashOffers.tsx, just the top result surfaced densely
// with dot indicators for how many more real deals exist.
export default async function FlashOffersCard() {
  const client = getSupabaseServiceClient();
  const offers = await getFlashOffers(client);
  const top = offers.slice(0, CARD_LIMIT);
  const best = top[0];

  return (
    <DashboardCardShell icon={<Zap size={16} />} title="Ofertas relâmpago" href="/products?sort=savings">
      {!best ? (
        <p className="text-sm text-slate-500">Nenhuma economia real disponível no momento.</p>
      ) : (
        <div>
          {best.productSlug ? (
            <Link href={`/product/${best.productSlug}`} className="block">
              <p className="line-clamp-2 text-sm font-bold text-white">{best.productName}</p>
            </Link>
          ) : (
            <p className="line-clamp-2 text-sm font-bold text-white">{best.productName}</p>
          )}

          <div className="mt-3 flex items-end gap-2">
            <span className="rounded-lg bg-red-500/15 px-2 py-1 text-xs font-bold text-red-400">
              -{best.savingsPercent.toFixed(0)}%
            </span>
            <span className="text-xs text-slate-500 line-through">US$ {best.oldPriceUSD.toFixed(0)}</span>
          </div>
          <p className="mt-1 text-xl font-black text-white">US$ {best.newPriceUSD.toFixed(2)}</p>
          <p className="mt-1 text-xs text-emerald-400">Economize US$ {best.savingsUSD.toFixed(2)}</p>
          <p className="mt-2 text-xs text-slate-500">{best.cheapestStoreName}</p>

          {top.length > 1 ? (
            <div className="mt-3 flex gap-1.5" aria-hidden="true">
              {top.map((_, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-blue-400" : "bg-slate-700"}`} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </DashboardCardShell>
  );
}
