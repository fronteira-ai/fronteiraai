import Image from "next/image";
import { Sparkles, ArrowLeftRight, Store, Flower2 } from "lucide-react";
import HeroStats from "./HeroStats";
import Reveal from "@/components/ui/Reveal";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getHomeStats } from "@/lib/home-premium-service";

const featureBullets = [
  { icon: ArrowLeftRight, title: "Compare preços", sub: "em tempo real", color: "text-brand-blue" },
  { icon: Store, title: "Centenas de lojas", sub: "confiáveis", color: "text-brand-purple" },
  { icon: Sparkles, title: "IA que encontra", sub: "o melhor para você", color: "text-positive" },
] as const;

// Release 1.9 — Program F — Wave 2 (v0 realignment, ADR-050 v1.1). Rebuilt
// against the CTO-approved v0 export: a photographic bridge backdrop instead
// of the previous CSS/SVG globe scene. Stats still come from
// MarketplaceMetricsService (via getHomeStats) — only the visual treatment
// changed. Search, store row and the "Comparar preços"/"Sou Lojista" CTAs
// used to live inside this component; the v0 layout treats them as separate
// sections below the hero (see app/page.tsx).
export default async function Hero() {
  const client = getSupabaseServiceClient();
  const stats = await getHomeStats(client);

  return (
    <section className="relative overflow-hidden bg-[oklch(0.14_0.03_265)] pt-[103px]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src="/hero-bridge.png"
          alt="Ponte da Amizade iluminada à noite, com a bandeira do Paraguai à esquerda e a bandeira do Brasil à direita sobre uma cidade futurista"
          fill
          priority
          className="object-cover object-[50%_47%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.14_0.03_265)_22%,oklch(0.14_0.03_265/0.55)_44%,transparent_64%)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[oklch(0.14_0.03_265)] to-transparent" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-[1600px] grid-cols-1 gap-8 px-6 lg:grid-cols-12 lg:px-10">
        <div className="lg:col-span-5">
          <Reveal direction="up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-cyan backdrop-blur-sm">
              <Sparkles size={14} />
              Inteligência artificial para compras no Paraguai
            </span>
          </Reveal>

          <Reveal direction="up" delay={100}>
            <h1 className="mt-6 max-w-xl font-home-display text-[40px] font-extrabold leading-[1.05] tracking-tight text-white sm:text-[46px]">
              <span className="block">O jeito mais</span>
              <span className="block">inteligente de</span>
              <span className="block bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">
                comprar no Paraguai.
              </span>
            </h1>
          </Reveal>

          <Reveal direction="up" delay={180}>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-slate-400">
              Compare preços entre centenas de lojas, converse com a nossa IA e
              descubra exatamente onde vale a pena comprar — antes de
              atravessar a fronteira.
            </p>
          </Reveal>

          <Reveal direction="up" delay={220} className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-4">
            {featureBullets.map((f) => (
              <div key={f.title} className="flex items-center gap-2.5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ${f.color}`}>
                  <f.icon size={16} />
                </span>
                <span className="text-[13px] leading-tight">
                  <span className="block font-semibold text-white">{f.title}</span>
                  <span className="block text-slate-400">{f.sub}</span>
                </span>
              </div>
            ))}
          </Reveal>
        </div>

        <div className="hidden lg:col-span-4 lg:block" />

        <Reveal direction="left" delay={200} className="flex flex-col gap-3 lg:col-span-3">
          <div className="glass-card flex items-start gap-3 rounded-2xl p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-purple/15 text-brand-purple">
              <Flower2 size={18} />
            </span>
            <div>
              <p className="text-balance font-home-display text-[15px] font-bold leading-tight text-white">
                Economize tempo e dinheiro
              </p>
              <p className="mt-1 text-[12.5px] leading-snug text-slate-400">
                Nossa IA analisa milhares de preços para você
              </p>
            </div>
          </div>
          <HeroStats stats={stats} />
        </Reveal>
      </div>
    </section>
  );
}
