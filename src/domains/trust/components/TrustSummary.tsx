import type { MerchantTrustSummary } from "../types/trust.types";
import { TrustStatus, TrustBadge } from "../types/enums";
import { ShieldCheck, Shield, ShieldX, ShieldAlert } from "lucide-react";

const STATUS_CONFIG: Record<TrustStatus, { label: string; color: string; Icon: React.FC<{ className?: string }> }> = {
  [TrustStatus.Verified]: { label: "Verificado", color: "text-emerald-400", Icon: ShieldCheck },
  [TrustStatus.Pending]: { label: "Em análise", color: "text-yellow-400", Icon: ShieldAlert },
  [TrustStatus.Unverified]: { label: "Não verificado", color: "text-slate-400", Icon: Shield },
  [TrustStatus.Suspended]: { label: "Suspenso", color: "text-red-400", Icon: ShieldX },
  [TrustStatus.Rejected]: { label: "Rejeitado", color: "text-red-400", Icon: ShieldX },
};

const BADGE_LABELS: Record<TrustBadge, string> = {
  [TrustBadge.None]: "",
  [TrustBadge.Basic]: "Básico",
  [TrustBadge.Verified]: "Verificado",
  [TrustBadge.Premium]: "Premium",
};

interface Props {
  summary: MerchantTrustSummary;
  size?: "sm" | "md";
}

export function TrustSummary({ summary, size = "md" }: Props) {
  const config = STATUS_CONFIG[summary.status] ?? STATUS_CONFIG[TrustStatus.Unverified];
  const { Icon } = config;
  const badgeLabel = BADGE_LABELS[summary.badgeLevel];

  return (
    <div
      className={`flex items-center gap-2 ${size === "sm" ? "text-sm" : "text-base"}`}
      aria-label={`Trust status: ${config.label}`}
    >
      <Icon className={`${size === "sm" ? "w-4 h-4" : "w-5 h-5"} ${config.color} flex-shrink-0`} aria-hidden="true" />
      <span className={`font-medium ${config.color}`}>{config.label}</span>
      {badgeLabel && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
          {badgeLabel}
        </span>
      )}
    </div>
  );
}
