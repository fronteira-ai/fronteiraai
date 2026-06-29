import { ShieldCheck, Calendar, User, FileText, Tag } from "lucide-react";
import type { TrustSignalRecord } from "../types/trust.types";
import { TrustSignalCategory } from "../types/enums";

const CATEGORY_LABELS: Record<TrustSignalCategory, string> = {
  [TrustSignalCategory.Identity]: "Identidade",
  [TrustSignalCategory.Business]: "Empresa",
  [TrustSignalCategory.Operational]: "Operacional",
  [TrustSignalCategory.Compliance]: "Conformidade",
};

interface Props {
  signal: TrustSignalRecord;
}

export function TrustExplainabilityCard({ signal }: Props) {
  const issuedDate = new Date(signal.issued_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 space-y-3">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white">{signal.title}</h3>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-400 whitespace-nowrap">
          {CATEGORY_LABELS[signal.category as TrustSignalCategory] ?? signal.category}
        </span>
      </header>

      <p className="text-sm text-slate-300 leading-relaxed">{signal.description}</p>

      <dl className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-700/50">
        <div className="flex items-start gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            <dt className="text-xs text-slate-500 font-medium">Quando foi verificado</dt>
            <dd className="text-xs text-slate-300">{issuedDate}</dd>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <User className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            <dt className="text-xs text-slate-500 font-medium">Quem verificou</dt>
            <dd className="text-xs text-slate-300">
              {signal.source === "admin" ? "Equipe ParaguAI" : signal.source}
            </dd>
          </div>
        </div>

        {signal.evidence_summary && (
          <div className="flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <dt className="text-xs text-slate-500 font-medium">Evidência</dt>
              <dd className="text-xs text-slate-300">{signal.evidence_summary}</dd>
            </div>
          </div>
        )}

        {signal.expires_at && (
          <div className="flex items-start gap-2">
            <Tag className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <dt className="text-xs text-slate-500 font-medium">Válido até</dt>
              <dd className="text-xs text-slate-300">
                {new Date(signal.expires_at).toLocaleDateString("pt-BR")}
              </dd>
            </div>
          </div>
        )}
      </dl>
    </article>
  );
}
