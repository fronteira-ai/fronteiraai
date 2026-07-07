import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getBestSavingsToday } from "@/lib/home-premium-service";

// Release 1.9 — Program F — Wave 1. Consumes PriceIntelligenceService
// (Program C — Wave 1, Market Intelligence Engine) through home-premium-service
// — the exact same computation the report's Galaxy S25 Ultra proof used.
export default async function EconomiaDoDia() {
  const client = getSupabaseServiceClient();
  const best = await getBestSavingsToday(client);

  if (!best) return null;

  return (
    <Section id="economia-do-dia">
      <Reveal direction="up">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 p-7 text-center shadow-2xl shadow-emerald-500/10 sm:p-10">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
            <Sparkles size={22} />
          </div>

          <p className="text-xs font-bold uppercase tracking-[3px] text-emerald-400">Economia do dia</p>
          <h3 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{best.productName}</h3>
          <p className="mt-1 text-sm text-slate-400">Melhor preço encontrado em {best.cheapestStoreName}</p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
            <div>
              <p className="text-sm text-slate-500 line-through">US$ {best.oldPriceUSD.toFixed(2)}</p>
              <p className="text-4xl font-black text-white">US$ {best.newPriceUSD.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl bg-emerald-500/15 px-5 py-3 text-emerald-400">
              <p className="text-2xl font-black">-{best.savingsPercent.toFixed(1)}%</p>
              <p className="text-xs">economia real</p>
            </div>
          </div>

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
