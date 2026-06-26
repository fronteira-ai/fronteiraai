"use client";
import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import type { MerchantRecommendation, RecommendationPriority } from "@/types/merchant";

const ICONS: Record<RecommendationPriority, React.ReactNode> = {
  critical: <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />,
  info: <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />,
};

const BG: Record<RecommendationPriority, string> = {
  critical: "border-red-500/20 bg-red-500/5",
  warning: "border-yellow-500/20 bg-yellow-500/5",
  info: "border-blue-500/20 bg-blue-500/5",
};

interface Props {
  recommendations: MerchantRecommendation[];
  onDismiss?: (id: string) => void;
}

export function RecommendationsPanel({ recommendations, onDismiss }: Props) {
  if (recommendations.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Recomendações</h2>
        <p className="text-sm text-slate-500">Nenhuma recomendação pendente. Excelente trabalho!</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white mb-3">
        Recomendações
        <span className="ml-2 text-xs font-normal text-slate-500">({recommendations.length})</span>
      </h2>
      <div className="space-y-2">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${BG[rec.priority]}`}
          >
            {ICONS[rec.priority]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{rec.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{rec.body}</p>
            </div>
            {onDismiss && (
              <button
                onClick={() => onDismiss(rec.id)}
                className="text-slate-600 hover:text-slate-400 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
