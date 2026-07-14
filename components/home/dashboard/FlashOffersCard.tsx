import Link from "next/link";
import { Tag, Coins } from "lucide-react";
import DashboardCardShell from "./DashboardCardShell";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getFlashOffers } from "@/lib/home-premium-service";
import { formatUSD } from "@/src/domains/exchange";

// Release 1.9 — Program F — Wave 2 (v0 realignment). Same
// PriceIntelligenceService.getSavingsOpportunity computation as before — the
// v0 "Deal of Day" card adds a product photo, which no real field backs here
// (SavingsHighlight has no image URL), so a plain icon tile stands in rather
// than fabricating a picture for a real product.
export default async function FlashOffersCard() {
  const client = getSupabaseServiceClient();
  const offers = await getFlashOffers(client);
  const best = offers[0];

  return (
    <DashboardCardShell icon={<Tag size={16} />} title="Economia do dia" href="/products?sort=savings">
      {!best ? (
        <p className="text-sm text-slate-500">Nenhuma economia real disponível no momento.</p>
      ) : (
        <>
          <div className="flex gap-4">
            <div className="flex h-28 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-brand-cyan">
              <Tag size={28} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                {best.productSlug ? (
                  <Link href={`/product/${best.productSlug}`} className="min-w-0">
                    <p className="line-clamp-2 text-[15px] font-semibold leading-tight text-white">{best.productName}</p>
                  </Link>
                ) : (
                  <p className="line-clamp-2 min-w-0 text-[15px] font-semibold leading-tight text-white">{best.productName}</p>
                )}
                <span className="shrink-0 rounded-lg bg-positive/15 px-2 py-1 text-sm font-bold text-positive">
                  -{best.savings.formattedPercent}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500 line-through">{formatUSD(best.oldPriceUSD)}</p>
              <p className="font-home-display text-2xl font-bold text-positive">{best.price.formattedUSD}</p>
              {best.price.formattedBRL ? <p className="text-xs text-slate-500">≈ {best.price.formattedBRL}</p> : null}
              <p className="mt-1 text-xs text-slate-500">{best.cheapestStoreName}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-sm font-medium text-amber">
            <Coins size={16} />
            Economize: {best.savings.formattedUSD}
            {best.savings.formattedBRL ? ` (≈ ${best.savings.formattedBRL})` : ""}
          </div>
        </>
      )}
    </DashboardCardShell>
  );
}
