import { ShieldCheck, Award, Star, Clock } from "lucide-react";
import type { MerchantInsights, TrustSignalRecord, MerchantBadgeRecord } from "../types/trust.types";
import { TrustBadge } from "../types/enums";

const BADGE_LABEL: Partial<Record<TrustBadge, string>> = {
  [TrustBadge.Verified]: "Loja Verificada",
  [TrustBadge.Premium]: "Loja Premium",
  [TrustBadge.Basic]: "Cadastro Básico",
};

interface HighlightProps {
  icon: React.FC<{ className?: string }>;
  text: string;
  color?: string;
}

function Highlight({ icon: Icon, text, color = "text-emerald-400" }: HighlightProps) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} aria-hidden="true" />
      <span className="text-sm text-slate-200">{text}</span>
    </div>
  );
}

interface Props {
  insights: MerchantInsights;
  activeSignals: TrustSignalRecord[];
  activeBadge: MerchantBadgeRecord | null;
}

export function MerchantHighlights({ insights, activeSignals, activeBadge }: Props) {
  const highlights: Array<{ icon: React.FC<{ className?: string }>; text: string; color?: string }> = [];

  if (activeBadge && BADGE_LABEL[activeBadge.badge_type as TrustBadge]) {
    highlights.push({ icon: Award, text: BADGE_LABEL[activeBadge.badge_type as TrustBadge]!, color: "text-amber-400" });
  }

  if (activeSignals.length > 0) {
    highlights.push({
      icon: ShieldCheck,
      text: `${activeSignals.length} ${activeSignals.length === 1 ? "sinal de confiança verificado" : "sinais de confiança verificados"}`,
    });
  }

  if (insights.reviewCount > 0 && insights.averageRating != null) {
    highlights.push({
      icon: Star,
      text: `Nota ${insights.averageRating.toFixed(1)}/5 baseada em ${insights.reviewCount} ${insights.reviewCount === 1 ? "avaliação" : "avaliações"}`,
      color: "text-yellow-400",
    });
  }

  if (insights.platformAgeInDays >= 365) {
    const years = Math.floor(insights.platformAgeInDays / 365);
    highlights.push({
      icon: Clock,
      text: `${years} ${years === 1 ? "ano" : "anos"} na plataforma`,
      color: "text-cyan-400",
    });
  }

  if (highlights.length === 0) return null;

  return (
    <section aria-labelledby="highlights-heading">
      <h2 id="highlights-heading" className="text-sm font-semibold text-white mb-2">
        Destaques
      </h2>
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-2 divide-y divide-slate-700/30">
        {highlights.map((h, i) => (
          <Highlight key={i} icon={h.icon} text={h.text} color={h.color} />
        ))}
      </div>
    </section>
  );
}
