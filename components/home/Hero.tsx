import { Zap, ShieldCheck, Sparkles as SparklesIcon } from "lucide-react";
import SearchBar from "./SearchBar";
import HeroCTAs from "./HeroCTAs";
import HeroGlobe from "./HeroGlobe";
import StoreCarousel from "./StoreCarousel";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/ui/StatCard";
import Reveal from "@/components/ui/Reveal";
import { animations } from "@/styles/animations";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getHomeStats } from "@/lib/home-premium-service";

const featureBullets = [
  { icon: Zap, label: "Preços em tempo real" },
  { icon: ShieldCheck, label: "Centenas de lojas confiáveis" },
  { icon: SparklesIcon, label: "IA que encontra o melhor para você" },
] as const;

// Stats come from MarketplaceMetricsService (marketplace-operations,
// Program 0 — Wave 1) — real counts, not the fictional numbers this
// section used to hardcode.
export default async function Hero() {
  const client = getSupabaseServiceClient();
  const stats = await getHomeStats(client);

  return (
    <section className="relative flex min-h-[92vh] items-center justify-center overflow-hidden bg-[#050816] pt-32 pb-[60px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#2563eb22,transparent_65%)]" />

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg,#ffffff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div
        className={`absolute left-1/2 top-1/3 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/30 blur-[180px] ${animations.glow}`}
      />

      <div className="pointer-events-none absolute left-[8%] top-[24%] hidden h-20 w-20 rounded-3xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-xl lg:block animate-[float_6s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute right-[10%] top-[58%] hidden h-14 w-14 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 backdrop-blur-xl lg:block animate-[float_8s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute right-[18%] top-[18%] hidden h-10 w-10 rounded-full border border-blue-400/30 bg-blue-400/10 backdrop-blur-xl lg:block animate-[float_7s_ease-in-out_infinite]" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <Reveal direction="up">
            <Badge className="bg-[linear-gradient(110deg,rgba(59,130,246,0.10)_40%,rgba(59,130,246,0.28)_50%,rgba(59,130,246,0.10)_60%)] bg-[length:200%_100%] animate-[shimmer_3s_linear_infinite]">
              Inteligência Artificial para compras no Paraguai
            </Badge>
          </Reveal>

          <Reveal direction="up" delay={100}>
            <h1 className="mt-8 max-w-4xl text-5xl font-black leading-[1.05] text-white md:text-7xl">
              O jeito mais inteligente de
              <br />
              <span
                className={`bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-400 bg-[length:200%_auto] bg-clip-text text-transparent ${animations.gradientShift}`}
              >
                comprar no Paraguai.
              </span>
            </h1>
          </Reveal>

          <Reveal direction="up" delay={180}>
            <p className="mt-8 max-w-2xl text-xl leading-9 text-slate-400">
              Compare preços entre centenas de lojas, converse com a nossa IA e
              descubra exatamente onde vale a pena comprar — antes de
              atravessar a fronteira.
            </p>
          </Reveal>

          <Reveal direction="up" delay={220} className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 lg:justify-start">
            {featureBullets.map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Icon size={15} />
                </span>
                {label}
              </span>
            ))}
          </Reveal>

          <Reveal direction="up" delay={260} className="w-full max-w-5xl">
            <SearchBar />
          </Reveal>

          <Reveal direction="up" delay={300} className="w-full max-w-5xl lg:self-start">
            <StoreCarousel />
          </Reveal>

          <Reveal direction="up" delay={320} className="w-full">
            <HeroCTAs />
          </Reveal>
        </div>

        <Reveal direction="left" delay={200} className="relative flex justify-center">
          <HeroGlobe />
          <div className="absolute -bottom-4 right-0 hidden max-w-[220px] rounded-2xl border border-slate-700 bg-slate-900/90 p-4 shadow-2xl shadow-blue-500/10 backdrop-blur-xl lg:block">
            <p className="text-sm font-bold text-white">Economize tempo e dinheiro</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Nossa IA analisa milhares de preços para você.
            </p>
          </div>
        </Reveal>
      </div>

      <Reveal
        direction="up"
        delay={400}
        className="relative z-10 mt-20 flex w-full flex-wrap justify-center gap-6 px-6"
      >
        <StatCard value={stats.stores} suffix="+" label="Lojas parceiras" />
        <StatCard value={stats.offers} suffix="+" label="Ofertas ativas" />
        <StatCard value={stats.products} suffix="+" label="Produtos cadastrados" />
        <div className="flex min-h-[180px] min-w-[260px] max-w-[420px] shrink-0 flex-col items-center justify-center gap-3 rounded-3xl border border-amber-500/30 bg-amber-500/5 px-4 py-9 text-center backdrop-blur sm:min-w-[260px] sm:px-7">
          <ShieldCheck size={28} className="text-amber-400" />
          <p className="text-lg font-bold text-amber-300">Economia garantida</p>
          <p className="text-sm text-slate-400">Sempre o melhor preço encontrado</p>
        </div>
      </Reveal>
    </section>
  );
}
