import type { MerchantVerificationRecord } from "../types/trust.types";
import { VerificationBadge } from "./VerificationBadge";
import { VerificationStatusDisplay } from "./VerificationStatusDisplay";
import { VerificationStatus } from "../types/enums";

type Props = {
  verification: MerchantVerificationRecord;
  typeLabel?: string;
};

export function VerificationCard({ verification, typeLabel }: Props) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">
            {typeLabel ?? verification.verification_type.replace(/_/g, " ")}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Submetida em {new Date(verification.submitted_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <VerificationBadge verification={verification} size="sm" />
      </div>

      <VerificationStatusDisplay
        status={verification.status as VerificationStatus}
        rejectionReason={verification.rejection_reason}
        expiresAt={verification.expires_at}
      />

      {verification.reviewed_at && (
        <p className="text-xs text-slate-500">
          Revisada em {new Date(verification.reviewed_at).toLocaleDateString("pt-BR")}
        </p>
      )}
    </div>
  );
}
