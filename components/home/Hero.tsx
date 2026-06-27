import SearchBar from "./SearchBar";
import HeroCTAs from "./HeroCTAs";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/ui/StatCard";
import Reveal from "@/components/ui/Reveal";
import { animations } from "@/styles/animations";

export default function Hero() {
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

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-6 text-center">
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

        <Reveal direction="up" delay={260} className="w-full max-w-5xl">
          <SearchBar />
        </Reveal>

        <Reveal direction="up" delay={320} className="w-full">
          <HeroCTAs />
        </Reveal>

        <Reveal
          direction="up"
          delay={400}
          className="mt-20 flex w-full flex-wrap justify-center gap-6"
        >
          <StatCard value={350} suffix="+" label="Lojas cadastradas" />
          <StatCard value={500000} suffix="+" label="Produtos monitorados" />
          <StatCard value={2000000} suffix="+" label="Ofertas analisadas" />
        </Reveal>
      </div>
    </section>
  );
}
