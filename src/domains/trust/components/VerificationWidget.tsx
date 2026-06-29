import type { MerchantVerificationRecord } from "../types/trust.types";
import { VerificationStatus } from "../types/enums";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

const STATUS_CONFIG = {
  [VerificationStatus.Approved]: { label: "Verificado", icon: CheckCircle2, color: "text-emerald-400" },
  [VerificationStatus.Pending]: { label: "Em análise", icon: Clock, color: "text-yellow-400" },
  [VerificationStatus.Rejected]: { label: "Rejeitado", icon: XCircle, color: "text-red-400" },
  [VerificationStatus.Expired]: { label: "Expirado", icon: XCircle, color: "text-slate-400" },
  [VerificationStatus.Revoked]: { label: "Revogado", icon: XCircle, color: "text-red-400" },
};

interface Props {
  verifications: MerchantVerificationRecord[];
}

export function VerificationWidget({ verifications }: Props) {
  const approved = verifications.filter((v) => v.status === VerificationStatus.Approved);

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">Verificações</h3>
        <span className="text-xs text-slate-400">{approved.length} ativas</span>
      </div>
      {verifications.length === 0 ? (
        <p className="text-xs text-slate-500 italic">Nenhuma verificação</p>
      ) : (
        <ul className="space-y-2" aria-label="Lista de verificações">
          {verifications.map((v) => {
            const cfg = STATUS_CONFIG[v.status] ?? STATUS_CONFIG[VerificationStatus.Pending];
            const Icon = cfg.icon;
            return (
              <li key={v.id} className="flex items-center gap-2 text-xs">
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${cfg.color}`} aria-hidden="true" />
                <span className="text-slate-300 capitalize">{v.verification_type.replace("_", " ")}</span>
                <span className={`ml-auto ${cfg.color}`}>{cfg.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
