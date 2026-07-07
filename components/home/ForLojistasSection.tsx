import Link from "next/link";
import { CheckCircle2, TrendingUp, Users, Zap, BarChart3, Star, Upload } from "lucide-react";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";

const benefits = [
  { icon: Users, title: "Mais visibilidade", desc: "Apareça para milhares de compradores que chegam todos os dias ao ParaguAI." },
  { icon: TrendingUp, title: "Comparação automática", desc: "Seus produtos aparecem automaticamente nas comparações de preço." },
  { icon: Zap, title: "Atualizações em tempo real", desc: "Sincronize seu catálogo via planilha, JSON, API ou integração direta." },
  { icon: BarChart3, title: "Dashboard profissional", desc: "Acompanhe visualizações, cliques e performance de cada produto." },
  { icon: Star, title: "Merchant Score", desc: "Conquiste selos de qualidade e destaque nos resultados de busca." },
  { icon: Upload, title: "Importação automática", desc: "Importe centenas de produtos de uma vez em minutos, não horas." },
];

export default function ForLojistasSection() {
  return (
    <Section id="para-lojistas" className="bg-gradient-to-b from-transparent via-emerald-950/10 to-transparent">
      <div className="mx-auto max-w-6xl">
        <Reveal direction="up">
          <div className="text-center mb-10">
            <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[2px] text-emerald-400 mb-4">
              Para Lojistas
            </span>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Venda para milhares de compradores{" "}
              <span className="text-emerald-400">todos os dias.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400 leading-relaxed">
              Cadastre gratuitamente sua loja no ParaguAI e sincronize seus produtos automaticamente
              através de site, planilhas, APIs ou integrações. Seu catálogo aparece para quem está
              pronto para comprar.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-9">
          {benefits.map((b, i) => (
            <Reveal key={b.title} direction="up" delay={i * 60}>
              <div className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-all duration-300 hover:border-emerald-500/30 hover:bg-slate-900">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 transition-colors group-hover:bg-emerald-500/20">
                  <b.icon size={20} className="text-emerald-400" />
                </div>
                <h3 className="mb-1.5 font-bold text-white">{b.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{b.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal direction="up">
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/60 via-slate-900/80 to-slate-950 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-8">
            <div className="flex-1">
              <p className="text-2xl font-black text-white mb-3">
                Comece agora. É gratuito.
              </p>
              <ul className="space-y-2">
                {["Cadastro em menos de 2 minutos", "Sem taxa de adesão", "Cancele quando quiser"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3 shrink-0 w-full sm:w-auto">
              <Link
                href="/merchant/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 py-3.5 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:bg-emerald-500 hover:scale-[1.03]"
              >
                Cadastrar minha loja
              </Link>
              <Link
                href="/para-lojistas"
                className="text-center text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                Conhecer todos os planos →
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
