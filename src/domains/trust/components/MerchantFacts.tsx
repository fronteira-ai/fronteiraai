import { Calendar, ShieldCheck, Star, Clock, RefreshCw, Activity } from "lucide-react";
import type { MerchantInsights } from "../types/trust.types";

function pluralize(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

function formatAge(days: number): string {
  if (days < 30) return pluralize(days, "dia", "dias");
  if (days < 365) return pluralize(Math.floor(days / 30), "mês", "meses");
  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  if (remainingMonths === 0) return pluralize(years, "ano", "anos");
  return `${pluralize(years, "ano", "anos")} e ${pluralize(remainingMonths, "mês", "meses")}`;
}

interface FactRowProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
  note?: string;
}

function FactRow({ icon: Icon, label, value, note }: FactRowProps) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-700/40 last:border-0">
      <Icon className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-sm text-white font-medium mt-0.5">{value}</p>
        {note && <p className="text-xs text-slate-500 mt-0.5">{note}</p>}
      </div>
    </div>
  );
}

interface Props {
  insights: MerchantInsights;
}

export function MerchantFacts({ insights }: Props) {
  const lastVerifiedText = insights.lastVerifiedAt
    ? new Date(insights.lastVerifiedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "Não verificado ainda";

  const lastUpdateText = insights.lastProfileUpdateAt
    ? new Date(insights.lastProfileUpdateAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "—";

  return (
    <section aria-labelledby="facts-heading">
      <h2 id="facts-heading" className="text-sm font-semibold text-white mb-3">
        Informações objetivas
      </h2>
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-1">
        <FactRow
          icon={Calendar}
          label="Tempo na plataforma"
          value={formatAge(insights.platformAgeInDays)}
          note={`Desde ${new Date(insights.joinedAt).toLocaleDateString("pt-BR")}`}
        />
        <FactRow
          icon={ShieldCheck}
          label="Verificações concluídas"
          value={pluralize(insights.verificationCount, "verificação", "verificações")}
        />
        <FactRow
          icon={Activity}
          label="Sinais de confiança ativos"
          value={pluralize(insights.activeSignalCount, "sinal ativo", "sinais ativos")}
        />
        <FactRow
          icon={Star}
          label="Avaliações recebidas"
          value={pluralize(insights.reviewCount, "avaliação", "avaliações")}
          note={insights.averageRating != null ? `Média: ${insights.averageRating.toFixed(1)}/5` : undefined}
        />
        <FactRow
          icon={Clock}
          label="Última verificação"
          value={lastVerifiedText}
        />
        <FactRow
          icon={RefreshCw}
          label="Última atualização do perfil"
          value={lastUpdateText}
        />
      </div>
    </section>
  );
}
