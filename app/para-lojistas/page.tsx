import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/constants/routes";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Reveal from "@/components/ui/Reveal";
import {
  CheckCircle2,
  Upload,
  Users,
  TrendingUp,
  BarChart3,
  Star,
  Zap,
  FileJson,
  Table2,
  Globe,
  Code2,
  ChevronDown,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Para Lojistas — Venda no ParaguAI | Marketplace do Paraguai",
  description:
    "Cadastre sua loja gratuitamente no ParaguAI e venda para milhares de compradores. Sincronize produtos via planilha, JSON, API ou integração. Dashboard profissional incluído.",
  keywords: [
    "lojista Paraguay",
    "vender no Paraguay",
    "marketplace Paraguay",
    "cadastrar loja Paraguay",
    "importação automática de produtos",
    "Ciudad del Este marketplace",
    "Merchant Score",
  ],
  alternates: { canonical: `${SITE_URL}/para-lojistas` },
  openGraph: {
    title: "Venda no ParaguAI — A maior plataforma do Paraguai",
    description:
      "Cadastre gratuitamente sua loja e sincronize produtos automaticamente. Dashboard, analytics e Merchant Score inclusos.",
    url: `${SITE_URL}/para-lojistas`,
    siteName: "ParaguAI",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Venda no ParaguAI — A maior plataforma do Paraguai",
    description:
      "Cadastre gratuitamente sua loja e sincronize produtos automaticamente.",
  },
};

const benefits = [
  { icon: Users, title: "Mais clientes", desc: "Acesse compradores que já estão buscando os produtos que você vende." },
  { icon: TrendingUp, title: "Comparação automática", desc: "Seus preços aparecem nas comparações em tempo real, sem esforço." },
  { icon: Zap, title: "Sincronização instantânea", desc: "Atualize centenas de preços ao mesmo tempo por planilha, JSON ou API." },
  { icon: BarChart3, title: "Dashboard profissional", desc: "Métricas de visualização, cliques, conversão e performance por produto." },
  { icon: Star, title: "Merchant Score", desc: "Destaque seus produtos com selos de qualidade nos resultados de busca." },
  { icon: Upload, title: "Importação em massa", desc: "Importe todo o seu catálogo de uma vez. Qualquer tamanho, qualquer formato." },
];

const steps = [
  { n: "01", title: "Cadastre sua loja", desc: "Crie sua conta gratuita em menos de 2 minutos. Sem cartão de crédito." },
  { n: "02", title: "Configure seu catálogo", desc: "Importe seus produtos via planilha, JSON, API ou cole manualmente." },
  { n: "03", title: "Apareça para compradores", desc: "Seus produtos entram automaticamente nas comparações de preço." },
  { n: "04", title: "Acompanhe os resultados", desc: "Visualizações, cliques e performance no seu painel em tempo real." },
];

const plans = [
  {
    key: "free",
    name: "Free",
    price: "R$0",
    period: "/mês",
    desc: "Para começar sem compromisso.",
    features: ["50 produtos", "1 importação por dia", "1 loja", "Dashboard básico"],
    cta: "Começar grátis",
    href: "/merchant/register",
    highlight: false,
    active: true,
  },
  {
    key: "pro",
    name: "Pro",
    price: "R$49",
    period: "/mês",
    desc: "Para lojistas em crescimento.",
    features: ["500 produtos", "10 importações por dia", "3 lojas", "Analytics avançado", "Prioridade no suporte"],
    cta: "Em breve",
    href: "#",
    highlight: true,
    active: false,
  },
  {
    key: "business",
    name: "Business",
    price: "R$149",
    period: "/mês",
    desc: "Para operações maiores.",
    features: ["5.000 produtos", "50 importações por dia", "10 lojas", "API dedicada", "Suporte prioritário"],
    cta: "Em breve",
    href: "#",
    highlight: false,
    active: false,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "R$399",
    period: "/mês",
    desc: "Sem limites. Suporte dedicado.",
    features: ["Produtos ilimitados", "Importações ilimitadas", "Lojas ilimitadas", "Account manager", "SLA garantido"],
    cta: "Em breve",
    href: "#",
    highlight: false,
    active: false,
  },
];

const integrations = [
  { icon: Table2, name: "Planilha (CSV)", desc: "Exporte seu catálogo para CSV e importe com um clique." },
  { icon: FileJson, name: "JSON / API REST", desc: "Conecte seu sistema diretamente via API ou arquivo JSON." },
  { icon: Globe, name: "Scraping automático", desc: "Coletamos dados do seu site e mantemos os preços atualizados." },
  { icon: Code2, name: "Integração personalizada", desc: "Conectores customizados para ERPs e plataformas de e-commerce." },
];

const faqs = [
  { q: "Quanto custa para cadastrar minha loja?", a: "O plano Free é gratuito para sempre. Você cadastra sua loja, importa até 50 produtos e já aparece para compradores sem pagar nada." },
  { q: "Como meus produtos aparecem nas comparações?", a: "Assim que você cadastra um produto, ele entra automaticamente no nosso índice de comparação de preços. Quando um comprador busca aquele produto, seu preço aparece ao lado das outras lojas." },
  { q: "Posso importar meu catálogo inteiro de uma vez?", a: "Sim. Você pode importar via planilha CSV, arquivo JSON, conectar via API ou ativar o scraping automático do seu site. Importações em massa de centenas de produtos são suportadas." },
  { q: "O que é o Merchant Score?", a: "É uma pontuação de 0 a 100 que mede a qualidade do seu perfil: produtos com imagem, preços atualizados, dados de contato completos, etc. Lojistas com score mais alto ganham destaque nos resultados de busca." },
  { q: "Quando os planos pagos estarão disponíveis?", a: "Os planos Pro, Business e Enterprise estão em desenvolvimento. Você pode começar com o Free agora e será notificado quando os planos avançados abrirem." },
];

export default function ParaLojistasPage() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      {/* Hero */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#10b98122,transparent_65%)]" />
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600/20 blur-[160px]" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <Reveal direction="up">
            <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[2px] text-emerald-400 mb-6">
              Área do Lojista ParaguAI
            </span>
          </Reveal>
          <Reveal direction="up" delay={80}>
            <h1 className="text-5xl font-black leading-[1.08] text-white sm:text-6xl lg:text-7xl">
              Seu produto visto por{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
                milhares de compradores.
              </span>
            </h1>
          </Reveal>
          <Reveal direction="up" delay={160}>
            <p className="mx-auto mt-6 max-w-2xl text-xl text-slate-400 leading-relaxed">
              Cadastre gratuitamente sua loja no ParaguAI. Sincronize seus produtos automaticamente
              e apareça para quem já está pronto para comprar.
            </p>
          </Reveal>
          <Reveal direction="up" delay={240}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/merchant/register"
                className="rounded-full bg-emerald-600 px-9 py-4 font-bold text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:bg-emerald-500 hover:scale-[1.03] active:scale-95"
              >
                Cadastrar minha loja — grátis
              </Link>
              <a
                href="#como-funciona"
                className="rounded-full border border-slate-600 px-9 py-4 font-semibold text-slate-300 transition-all duration-300 hover:border-slate-400 hover:text-white"
              >
                Como funciona
              </a>
            </div>
          </Reveal>
          <Reveal direction="up" delay={300}>
            <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-slate-500">
              {["Sem taxa de adesão", "Cancele quando quiser", "Suporte em português"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 border-t border-slate-800/50">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal direction="up">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-black text-white sm:text-4xl">Por que usar o ParaguAI?</h2>
              <p className="mt-4 text-slate-400 max-w-xl mx-auto">Tudo que você precisa para transformar sua loja em um canal de vendas digital.</p>
            </div>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b, i) => (
              <Reveal key={b.title} direction="up" delay={i * 60}>
                <div className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-6 transition-all duration-300 hover:border-emerald-500/30 hover:bg-slate-900">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 transition-colors group-hover:bg-emerald-500/20">
                    <b.icon size={20} className="text-emerald-400" />
                  </div>
                  <h3 className="mb-1.5 font-bold text-white">{b.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{b.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-24 border-t border-slate-800/50">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal direction="up">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-black text-white sm:text-4xl">Como funciona</h2>
              <p className="mt-4 text-slate-400">Em 4 passos você já está vendendo.</p>
            </div>
          </Reveal>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal key={s.n} direction="up" delay={i * 80}>
                <div className="relative">
                  <div className="text-5xl font-black text-emerald-500/20 leading-none mb-4">{s.n}</div>
                  <h3 className="font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="planos" className="py-24 border-t border-slate-800/50">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal direction="up">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-black text-white sm:text-4xl">Planos</h2>
              <p className="mt-4 text-slate-400">Comece grátis. Escale quando precisar.</p>
            </div>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan, i) => (
              <Reveal key={plan.key} direction="up" delay={i * 60}>
                <div className={`relative flex flex-col rounded-2xl border p-6 h-full ${
                  plan.highlight
                    ? "border-emerald-500/50 bg-gradient-to-b from-emerald-950/60 to-slate-900"
                    : "border-slate-800 bg-slate-900/40"
                }`}>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                        Popular
                      </span>
                    </div>
                  )}
                  <div className="mb-5">
                    <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                    <div className="mt-2 flex items-end gap-1">
                      <span className="text-3xl font-black text-white">{plan.price}</span>
                      <span className="text-slate-500 text-sm pb-1">{plan.period}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{plan.desc}</p>
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-400">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {plan.active ? (
                    <Link
                      href={plan.href}
                      className={`rounded-xl px-4 py-2.5 text-center text-sm font-bold transition-all ${
                        plan.highlight
                          ? "bg-emerald-600 text-white hover:bg-emerald-500"
                          : "border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  ) : (
                    <div className="rounded-xl border border-slate-800 px-4 py-2.5 text-center text-sm text-slate-600 cursor-not-allowed">
                      Em breve
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-24 border-t border-slate-800/50">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal direction="up">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-black text-white sm:text-4xl">Importação automática</h2>
              <p className="mt-4 text-slate-400 max-w-lg mx-auto">Conecte seu catálogo da forma que for mais conveniente para você.</p>
            </div>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {integrations.map((int, i) => (
              <Reveal key={int.name} direction="up" delay={i * 70}>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                    <int.icon size={22} className="text-blue-400" />
                  </div>
                  <h3 className="font-bold text-white mb-1.5">{int.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{int.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 border-t border-slate-800/50">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal direction="up">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-black text-white sm:text-4xl">Perguntas frequentes</h2>
            </div>
          </Reveal>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <Reveal key={i} direction="up" delay={i * 50}>
                <details className="group rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 font-semibold text-white list-none">
                    {faq.q}
                    <ChevronDown size={18} className="text-slate-500 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-5 pb-5 text-sm text-slate-400 leading-relaxed border-t border-slate-800 pt-4">
                    {faq.a}
                  </div>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 border-t border-slate-800/50">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal direction="up">
            <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/60 via-slate-900/80 to-slate-950 p-10 sm:p-14 text-center">
              <div className="pointer-events-none absolute inset-0 -z-10" />
              <h2 className="text-3xl font-black text-white sm:text-4xl mb-4">
                Pronto para vender no ParaguAI?
              </h2>
              <p className="text-slate-400 max-w-lg mx-auto mb-8">
                Cadastre sua loja gratuitamente hoje e comece a aparecer para milhares de compradores que chegam todos os dias.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  href="/merchant/register"
                  className="rounded-full bg-emerald-600 px-9 py-4 font-bold text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:bg-emerald-500 hover:scale-[1.03]"
                >
                  Cadastrar minha loja — grátis
                </Link>
                <Link
                  href="/merchant/login"
                  className="rounded-full border border-slate-600 px-9 py-4 font-semibold text-slate-300 transition-all duration-300 hover:border-slate-400 hover:text-white"
                >
                  Já tenho uma loja
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
