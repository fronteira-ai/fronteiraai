"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, EyeOff, Trash2, RotateCcw, Loader2 } from "lucide-react";
import type { ReviewStatus } from "@/src/domains/trust/types/enums";

interface Props {
  reviewId: string;
  status: ReviewStatus;
}

type ModerationAction = "approve" | "hide" | "remove" | "restore";

const ACTIONS: Array<{
  action: ModerationAction;
  label: string;
  icon: React.FC<{ className?: string }>;
  className: string;
  showFor: ReviewStatus[];
}> = [
  {
    action: "approve",
    label: "Aprovar",
    icon: CheckCircle2,
    className: "bg-emerald-600 hover:bg-emerald-500 text-white",
    showFor: ["pending", "hidden"] as ReviewStatus[],
  },
  {
    action: "hide",
    label: "Ocultar",
    icon: EyeOff,
    className: "bg-slate-700 hover:bg-slate-600 text-slate-200",
    showFor: ["pending", "approved"] as ReviewStatus[],
  },
  {
    action: "remove",
    label: "Remover",
    icon: Trash2,
    className: "bg-red-700 hover:bg-red-600 text-white",
    showFor: ["pending", "approved", "hidden"] as ReviewStatus[],
  },
  {
    action: "restore",
    label: "Restaurar",
    icon: RotateCcw,
    className: "bg-cyan-700 hover:bg-cyan-600 text-white",
    showFor: ["hidden", "removed"] as ReviewStatus[],
  },
];

export function ReviewModerationClient({ reviewId, status }: Props) {
  const [loading, setLoading] = useState<ModerationAction | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const availableActions = ACTIONS.filter((a) => a.showFor.includes(status));

  async function handleAction(action: ModerationAction) {
    setLoading(action);
    setError(null);

    try {
      const res = await fetch(`/api/admin/trust/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erro ao moderar"); return; }
      router.refresh();
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4 p-4 rounded-xl border border-slate-700/50 bg-slate-800/30">
      <h3 className="text-sm font-semibold text-white">Ações de moderação</h3>

      <div>
        <label htmlFor="moderation-reason" className="block text-xs text-slate-400 mb-1">
          Motivo (opcional)
        </label>
        <input
          id="moderation-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: conteúdo inadequado, spam..."
          className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {availableActions.map(({ action, label, icon: Icon, className }) => (
          <button
            key={action}
            type="button"
            onClick={() => handleAction(action)}
            disabled={loading !== null}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            aria-label={`${label} este review`}
            aria-busy={loading === action}
          >
            {loading === action
              ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              : <Icon className="w-4 h-4" aria-hidden="true" />
            }
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
    </div>
  );
}
