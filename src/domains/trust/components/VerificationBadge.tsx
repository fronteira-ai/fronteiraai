import { VerificationStatus } from "../types/enums";
import type { MerchantVerificationRecord } from "../types/trust.types";

const STATUS_CONFIG = {
  [VerificationStatus.Approved]: { label: "Verificado", class: "bg-green-500/15 text-green-400 border-green-500/30" },
  [VerificationStatus.Pending]: { label: "Pendente", class: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  [VerificationStatus.Rejected]: { label: "Rejeitado", class: "bg-red-500/15 text-red-400 border-red-500/30" },
  [VerificationStatus.Expired]: { label: "Expirado", class: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  [VerificationStatus.Revoked]: { label: "Revogado", class: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
};

type Props = {
  verification: MerchantVerificationRecord;
  size?: "sm" | "md";
};

export function VerificationBadge({ verification, size = "md" }: Props) {
  const config = STATUS_CONFIG[verification.status as VerificationStatus] ?? STATUS_CONFIG[VerificationStatus.Pending];
  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2.5 py-1";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClass} ${config.class}`}>
      {verification.status === VerificationStatus.Approved && (
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {config.label}
    </span>
  );
}
