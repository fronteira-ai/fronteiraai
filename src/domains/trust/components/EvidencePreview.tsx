import type { VerificationEvidenceRecord } from "../types/trust.types";
import { EvidenceType } from "../types/enums";
import { FileText, Image, Link, AlignLeft, Braces } from "lucide-react";

const TYPE_ICONS: Record<EvidenceType, React.FC<{ className?: string }>> = {
  [EvidenceType.Document]: FileText,
  [EvidenceType.Image]: Image,
  [EvidenceType.Url]: Link,
  [EvidenceType.Text]: AlignLeft,
  [EvidenceType.Json]: Braces,
};

const TYPE_LABELS: Record<EvidenceType, string> = {
  [EvidenceType.Document]: "Documento",
  [EvidenceType.Image]: "Imagem",
  [EvidenceType.Url]: "URL",
  [EvidenceType.Text]: "Texto",
  [EvidenceType.Json]: "JSON",
};

interface Props {
  evidences: VerificationEvidenceRecord[];
}

export function EvidencePreview({ evidences }: Props) {
  const active = evidences.filter((e) => !e.deleted_at);

  if (active.length === 0) {
    return <p className="text-xs text-slate-500 italic">Nenhuma evidência anexada.</p>;
  }

  return (
    <ul className="space-y-2" aria-label="Evidências">
      {active.map((evidence) => {
        const IconComponent = TYPE_ICONS[evidence.evidence_type as EvidenceType] ?? FileText;
        const typeLabel = TYPE_LABELS[evidence.evidence_type as EvidenceType] ?? evidence.evidence_type;

        return (
          <li
            key={evidence.id}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50"
          >
            <IconComponent className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white truncate">{evidence.label}</p>
              <p className="text-xs text-slate-500">{typeLabel}</p>
            </div>
            {evidence.is_valid === true && (
              <span className="text-xs text-emerald-400 flex-shrink-0">Válida</span>
            )}
            {evidence.is_valid === false && (
              <span className="text-xs text-red-400 flex-shrink-0">Inválida</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
