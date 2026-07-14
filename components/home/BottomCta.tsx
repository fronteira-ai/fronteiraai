import Link from "next/link";
import { Clock, ShieldCheck, BadgePercent, Bot, ArrowRight, type LucideIcon } from "lucide-react";

const TRUST: { icon: LucideIcon; title: string; sub: string; color: string }[] = [
  { icon: Clock, title: "Atualizado 24h por dia", sub: "Preços sempre atualizados", color: "text-brand-cyan" },
  { icon: ShieldCheck, title: "100% Seguro", sub: "Seus dados protegidos", color: "text-positive" },
  { icon: BadgePercent, title: "Melhores preços", sub: "Economia comprovada por dado real", color: "text-amber" },
  { icon: Bot, title: "IA que recomenda", sub: "Realmente vale a pena", color: "text-brand-purple" },
];

// Release 1.9 — Program F — Wave 2 (v0 realignment, ADR-050 v1.1). New
// component — the v0 export's compact trust strip + lojista banner has no
// predecessor in the previous Home; ForLojistasSection/CTASection cover
// similar ground at much greater length further down the page and are kept
// as-is.
export default function BottomCta() {
  return (
    <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">
      <div className="glass-card grid grid-cols-1 gap-4 rounded-2xl p-5 sm:grid-cols-2 lg:col-span-8 xl:grid-cols-4">
        {TRUST.map((t) => (
          <div key={t.title} className="flex items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 ${t.color}`}>
              <t.icon size={20} />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-white">{t.title}</span>
              <span className="block text-xs text-slate-400">{t.sub}</span>
            </span>
          </div>
        ))}
      </div>

      <Link
        href="/para-lojistas"
        className="group flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-purple to-brand-blue p-5 text-white shadow-[0_0_40px_-12px_var(--color-brand-purple)] lg:col-span-4"
      >
        <span className="leading-tight">
          <span className="block font-home-display text-base font-bold">É lojista? Venda no Paraguai</span>
          <span className="block text-sm text-white/80">Acesse nossa plataforma exclusiva para lojistas</span>
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-1">
          <ArrowRight size={20} />
        </span>
      </Link>
    </div>
  );
}
