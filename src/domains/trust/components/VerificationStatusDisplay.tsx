import { VerificationStatus } from "../types/enums";

const LABELS: Record<VerificationStatus, string> = {
  [VerificationStatus.Pending]: "Pendente de revisão",
  [VerificationStatus.Approved]: "Verificado",
  [VerificationStatus.Rejected]: "Rejeitado",
  [VerificationStatus.Expired]: "Expirado",
  [VerificationStatus.Revoked]: "Revogado",
};

const DESCRIPTIONS: Record<VerificationStatus, string> = {
  [VerificationStatus.Pending]: "Esta verificação está aguardando revisão da equipe ParaguAI.",
  [VerificationStatus.Approved]: "Esta verificação foi aprovada e está ativa.",
  [VerificationStatus.Rejected]: "Esta verificação foi rejeitada. Consulte o motivo informado.",
  [VerificationStatus.Expired]: "Esta verificação expirou e precisa ser renovada.",
  [VerificationStatus.Revoked]: "Esta verificação foi revogada por um administrador.",
};

type Props = {
  status: VerificationStatus;
  rejectionReason?: string | null;
  expiresAt?: string | null;
};

export function VerificationStatusDisplay({ status, rejectionReason, expiresAt }: Props) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-white">{LABELS[status]}</p>
      <p className="text-xs text-slate-400">{DESCRIPTIONS[status]}</p>
      {rejectionReason && (
        <p className="text-xs text-red-300 mt-1">Motivo: {rejectionReason}</p>
      )}
      {expiresAt && status === VerificationStatus.Approved && (
        <p className="text-xs text-slate-400 mt-1">
          Válido até: {new Date(expiresAt).toLocaleDateString("pt-BR")}
        </p>
      )}
    </div>
  );
}
