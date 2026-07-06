"use client";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { MarketplaceAlert } from "@/src/domains/marketplace-operations/types";

const SEVERITY_STYLE: Record<string, { color: string; bg: string }> = {
  critical: { color: "text-red-400", bg: "border-red-500/20 bg-red-500/5" },
  warning: { color: "text-amber-400", bg: "border-amber-500/20 bg-amber-500/5" },
  info: { color: "text-slate-400", bg: "border-slate-700 bg-slate-800/40" },
};

export function AlertsList({
  alerts,
  onAction,
}: {
  alerts: MarketplaceAlert[] | null;
  onAction: (id: string, action: "acknowledge" | "resolve" | "ignore") => void;
}) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-sm text-emerald-400">
        Nenhum alerta pendente — marketplace operando normalmente.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {alerts.map((alert) => {
        const style = SEVERITY_STYLE[alert.severity] ?? SEVERITY_STYLE.info;
        return (
          <li key={alert.id} className={`rounded-xl border p-4 ${style.bg}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={`flex items-center gap-2 text-sm font-medium ${style.color}`}>
                  <AlertTriangle className="w-4 h-4" />
                  {alert.title}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(alert.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <AdminButton size="sm" variant="secondary" onClick={() => onAction(alert.id, "acknowledge")}>
                  Reconhecer
                </AdminButton>
                <AdminButton
                  size="sm"
                  variant="primary"
                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  onClick={() => onAction(alert.id, "resolve")}
                >
                  Resolver
                </AdminButton>
                <AdminButton
                  size="sm"
                  variant="ghost"
                  icon={<XCircle className="w-3.5 h-3.5" />}
                  onClick={() => onAction(alert.id, "ignore")}
                >
                  Ignorar
                </AdminButton>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
