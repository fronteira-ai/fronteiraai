import type { VerificationAuditRecord } from "../types/trust.types";

const ACTION_LABEL: Record<string, string> = {
  created: "Criada",
  submitted: "Submetida",
  approved: "Aprovada",
  rejected: "Rejeitada",
  revoked: "Revogada",
  expired: "Expirada",
  evidence_added: "Evidência adicionada",
  evidence_removed: "Evidência removida",
  metadata_updated: "Informações atualizadas",
};

const ACTION_COLOR: Record<string, string> = {
  approved: "bg-green-500",
  rejected: "bg-red-500",
  revoked: "bg-orange-500",
  created: "bg-slate-500",
  submitted: "bg-cyan-500",
  expired: "bg-slate-400",
  evidence_added: "bg-blue-500",
  evidence_removed: "bg-red-400",
  metadata_updated: "bg-slate-500",
};

type Props = {
  history: VerificationAuditRecord[];
};

export function VerificationTimeline({ history }: Props) {
  if (history.length === 0) {
    return <p className="text-slate-500 text-sm">Sem histórico de ações.</p>;
  }

  const sorted = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <ol className="relative border-l border-slate-700 space-y-4 pl-5">
      {sorted.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            className={`absolute -left-[1.35rem] top-1 h-2 w-2 rounded-full ring-2 ring-slate-900 ${ACTION_COLOR[entry.action] ?? "bg-slate-500"}`}
          />
          <p className="text-sm font-medium text-white">
            {ACTION_LABEL[entry.action] ?? entry.action}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(entry.created_at).toLocaleString("pt-BR")}
            {entry.performed_by_role && ` · ${entry.performed_by_role}`}
          </p>
          {entry.reason && (
            <p className="text-xs text-slate-300 mt-0.5 italic">{entry.reason}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
