import { TrustStatus, TrustBadge } from "../types/enums";

// ── Status labels ─────────────────────────────────────────────────────────────

export function getTrustStatusLabel(status: TrustStatus): string {
  const labels: Record<TrustStatus, string> = {
    [TrustStatus.Unverified]: "Não verificado",
    [TrustStatus.Pending]: "Em análise",
    [TrustStatus.Verified]: "Verificado",
    [TrustStatus.Suspended]: "Suspenso",
    [TrustStatus.Rejected]: "Rejeitado",
  };
  return labels[status] ?? status;
}

export function getTrustStatusColor(status: TrustStatus): string {
  const colors: Record<TrustStatus, string> = {
    [TrustStatus.Unverified]: "text-slate-400",
    [TrustStatus.Pending]: "text-yellow-400",
    [TrustStatus.Verified]: "text-green-400",
    [TrustStatus.Suspended]: "text-red-400",
    [TrustStatus.Rejected]: "text-red-600",
  };
  return colors[status] ?? "text-slate-400";
}

// ── Badge labels ──────────────────────────────────────────────────────────────

export function getBadgeLabel(badge: TrustBadge): string {
  const labels: Record<TrustBadge, string> = {
    [TrustBadge.None]: "Sem badge",
    [TrustBadge.Basic]: "Loja",
    [TrustBadge.Verified]: "Verificada",
    [TrustBadge.Premium]: "Verificada Premium",
  };
  return labels[badge] ?? badge;
}

export function getBadgeColor(badge: TrustBadge): string {
  const colors: Record<TrustBadge, string> = {
    [TrustBadge.None]: "text-slate-500",
    [TrustBadge.Basic]: "text-slate-300",
    [TrustBadge.Verified]: "text-blue-400",
    [TrustBadge.Premium]: "text-yellow-400",
  };
  return colors[badge] ?? "text-slate-400";
}

// ── Score display ─────────────────────────────────────────────────────────────

export function formatTrustScore(score: number): string {
  return `${score}/100`;
}

export function getTrustScoreLevel(score: number): "low" | "medium" | "high" | "excellent" {
  if (score < 25) return "low";
  if (score < 50) return "medium";
  if (score < 75) return "high";
  return "excellent";
}

// ── Date helpers ──────────────────────────────────────────────────────────────

export function formatTrustDate(isoString: string | null): string {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function monthsSince(isoString: string): number {
  const diff = Date.now() - new Date(isoString).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
}

// ── Badge eligibility rules (read-only — no score computation) ────────────────

export function isBadgeEligible(badge: TrustBadge, status: TrustStatus): boolean {
  if (badge === TrustBadge.None) return true;
  if (badge === TrustBadge.Basic) return true;
  if (badge === TrustBadge.Verified) return status === TrustStatus.Verified;
  if (badge === TrustBadge.Premium) return status === TrustStatus.Verified;
  return false;
}
