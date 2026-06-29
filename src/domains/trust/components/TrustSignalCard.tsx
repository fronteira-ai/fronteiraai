import type { TrustSignalRecord } from "../types/trust.types";
import { TrustSignalCategory } from "../types/enums";
import { ShieldCheck, MapPin, Phone, Clock, Building2, FileText, RefreshCw, Award, CheckCircle2 } from "lucide-react";

const CATEGORY_COLORS: Record<TrustSignalCategory, string> = {
  [TrustSignalCategory.Identity]: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  [TrustSignalCategory.Business]: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  [TrustSignalCategory.Operational]: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  [TrustSignalCategory.Compliance]: "text-violet-400 bg-violet-500/10 border-violet-500/30",
};

const SIGNAL_ICONS: Record<string, React.FC<{ className?: string }>> = {
  company_verified: Building2,
  identity_validated: ShieldCheck,
  location_confirmed: MapPin,
  contact_confirmed: Phone,
  hours_confirmed: Clock,
  official_partner: Award,
  documentation_verified: FileText,
  recurring_operation: RefreshCw,
};

interface Props {
  signal: TrustSignalRecord;
  compact?: boolean;
}

export function TrustSignalCard({ signal, compact = false }: Props) {
  const IconComponent = SIGNAL_ICONS[signal.signal_type] ?? CheckCircle2;
  const colors = CATEGORY_COLORS[signal.category as TrustSignalCategory] ?? "text-slate-400 bg-slate-500/10 border-slate-500/30";

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${colors}`}
        title={signal.description}
        aria-label={signal.title}
      >
        <IconComponent className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        <span>{signal.title}</span>
      </div>
    );
  }

  return (
    <article
      className={`flex items-start gap-3 p-4 rounded-xl border ${colors} transition-colors`}
      aria-label={`Sinal de confiança: ${signal.title}`}
    >
      <div className="flex-shrink-0 mt-0.5">
        <IconComponent className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-tight">{signal.title}</h3>
        <p className="text-xs mt-0.5 opacity-75 leading-relaxed">{signal.description}</p>
        {signal.evidence_summary && (
          <p className="text-xs mt-1 opacity-60 italic">{signal.evidence_summary}</p>
        )}
      </div>
    </article>
  );
}
