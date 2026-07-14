import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getBestSavingsToday } from "@/lib/home-premium-service";
import { formatUSD } from "@/src/domains/exchange";

// Release 1.9 — Program F — Wave 1. Consumes PriceIntelligenceService
// (Program C — Wave 1, Market Intelligence Engine) through home-premium-service
// — the exact same computation the report's Galaxy S25 Ultra proof used.
//
// Program UX — Mission UX-1C (Objetivo 3). Renamed from EconomiaDoDia —
// "Achado do Dia" is now this experience's official name everywhere:
// heading, section id, and this file itself (was components/home/
// EconomiaDoDia.tsx). Objetivo 4/5: the card now leads with what the
// ParaguAI did ("selecionado pelo ParaguAI"), not with the store's name.
// Objetivo 6: absolute savings (savingsUSD, already computed by
// getBestSavingsToday — no new field, no new logic) is now the dominant
// stat; the percentage moves to a secondary badge. Objetivo 7's audit of
// how this pick is actually chosen lives in
// docs/product/OPPORTUNITY_SCORE_PROPOSAL.md, not in this component.
export default async function AchadoDoDia() {
  const client = getSupabaseServiceClient();
  const best = await getBestSavingsToday(client);

  if (!best) return null;

  return (
    <Section id="achado-do-dia">
      <Reveal direction="up">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 p-7 text-center shadow-2xl shadow-emerald-500/10 sm:p-10">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
            <Sparkles size={22} />
          </div>

          <p className="text-xs font-bold uppercase tracking-[3px] text-emerald-400">Achado do dia</p>
          <h3 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{best.productName}</h3>
          <p className="mt-1 text-sm text-slate-400">
            Selecionado pelo ParaguAI — disponível em {best.cheapestStoreName}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Economize</p>
              <p className="text-4xl font-black text-white">{best.savings.formattedUSD}</p>
              {best.savings.formattedBRL ? <p className="text-sm text-slate-400">≈ {best.savings.formattedBRL}</p> : null}
            </div>
            <div className="rounded-2xl bg-emerald-500/15 px-5 py-3 text-emerald-400">
              <p className="text-lg font-bold">-{best.savings.formattedPercent}</p>
              <p className="text-xs">
                de {formatUSD(best.oldPriceUSD)} para {best.price.formattedUSD}
              </p>
            </div>
          </div>

          {best.price.formattedRate ? (
            <p className={`mt-4 text-xs ${best.price.isStale ? "text-amber-400" : "text-slate-500"}`}>
              🌎 {best.price.formattedRate} — {best.price.formattedTimestamp}
            </p>
          ) : null}

          {best.productSlug ? (
            <Link
              href={`/product/${best.productSlug}`}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Ver oferta
              <ArrowRight size={16} />
            </Link>
          ) : null}
        </div>
      </Reveal>
    </Section>
  );
}
