import Image from "next/image";
import HeroStats from "./HeroStats";
import Reveal from "@/components/ui/Reveal";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getHomeStats } from "@/lib/home-premium-service";

// Sprint 39B — Home 2.0 (Search as the Hero, Direction A — Evolution).
// Fold com 1 mensagem (H1 + subcopy), 1 ação (a busca, em SearchBar) e 1
// prova discreta (HeroStats com contagens reais). Removidos do fold por
// competirem ou por falta de evidência: badge de IA, feature bullets
// ("Melhor compra"/"Lojas confiáveis" — CONDITIONAL), glass-card de IA
// ("Nossa IA analisa milhares de preços") e o claim "Garanta sempre o
// melhor preço" (UNSUPPORTED — ver auditoria de trust da 39A).
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
          <Reveal direction="up" delay={100}>
            <h1 className="mt-6 max-w-xl font-home-display text-[40px] font-extrabold leading-[1.05] tracking-tight text-white sm:text-[46px]">
              <span className="block">Compare e economize</span>
              <span className="block">nas lojas do</span>
              <span className="block bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">
                Paraguai.
              </span>
            </h1>
          </Reveal>

          <Reveal direction="up" delay={180}>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-slate-400">
              Preços reais, lojas verificadas e histórico — antes de atravessar a ponte.
            </p>
          </Reveal>
        </div>

        <div className="hidden lg:col-span-4 lg:block" />

        <Reveal direction="left" delay={200} className="flex flex-col gap-3 lg:col-span-3">
          <HeroStats stats={stats} />
        </Reveal>
      </div>
    </section>
  );
}
