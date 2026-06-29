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

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
  expired: "Expirada",
  revoked: "Revogada",
};

type Props = {
  history: VerificationAuditRecord[];
};

export function HistoryTable({ history }: Props) {
  if (history.length === 0) {
    return <p className="text-slate-500 text-sm">Sem histórico.</p>;
  }

  const sorted = [...history].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="rounded-lg border border-slate-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-800 text-slate-400">
          <tr>
            <th className="text-left px-4 py-2.5 font-medium">Ação</th>
            <th className="text-left px-4 py-2.5 font-medium">Status anterior</th>
            <th className="text-left px-4 py-2.5 font-medium">Novo status</th>
            <th className="text-left px-4 py-2.5 font-medium">Por</th>
            <th className="text-left px-4 py-2.5 font-medium">Data</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {sorted.map((entry) => (
            <tr key={entry.id} className="bg-slate-900/30 hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-2.5 text-white">
                {ACTION_LABEL[entry.action] ?? entry.action}
                {entry.reason && (
                  <p className="text-xs text-slate-400 italic">{entry.reason}</p>
                )}
              </td>
              <td className="px-4 py-2.5 text-slate-400 text-xs">
                {entry.previous_status ? (STATUS_LABEL[entry.previous_status] ?? entry.previous_status) : "—"}
              </td>
              <td className="px-4 py-2.5 text-slate-400 text-xs">
                {entry.new_status ? (STATUS_LABEL[entry.new_status] ?? entry.new_status) : "—"}
              </td>
              <td className="px-4 py-2.5 text-slate-400 text-xs capitalize">
                {entry.performed_by_role ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-slate-400 text-xs">
                {new Date(entry.created_at).toLocaleString("pt-BR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
