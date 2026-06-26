"use client";
import Link from "next/link";
import { X, Sparkles, CheckCircle2 } from "lucide-react";
import type { MerchantRecommendation, RecommendationPriority } from "@/types/merchant";

const STYLE: Record<RecommendationPriority, { border: string; dot: string; label: string }> = {
  critical: { border: "border-red-500/20 bg-red-500/5",    dot: "bg-red-500",    label: "Urgente" },
  warning:  { border: "border-yellow-500/20 bg-yellow-500/5", dot: "bg-yellow-500", label: "Atenção" },
  info:     { border: "border-blue-500/20 bg-blue-500/5",   dot: "bg-blue-500",   label: "Dica" },
};

const ACTION_HREF: Record<string, string> = {
  no_products:     "/merchant/imports/new",
  missing_images:  "/merchant/imports/new",
  missing_category:"/merchant/products",
  missing_price:   "/merchant/imports/new",
  missing_contact: "/merchant/settings",
  stale_catalog:   "/merchant/imports/new",
};

const ACTION_LABEL: Record<string, string> = {
  no_products:     "Importar agora",
  missing_images:  "Sincronizar com mídia",
  missing_category:"Ver produtos",
  missing_price:   "Sincronizar preços",
  missing_contact: "Adicionar contato",
  stale_catalog:   "Sincronizar agora",
};

interface Props {
  recommendations: MerchantRecommendation[];
  onDismiss?: (id: string) => void;
}

export function RecommendationsPanel({ recommendations, onDismiss }: Props) {
  if (recommendations.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center text-center min-h-[180px]">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <p className="text-sm font-semibold text-white mb-1">Loja em ótima forma!</p>
        <p className="text-xs text-slate-500 max-w-xs">
          Nenhuma ação necessária no momento. Continue sincronizando seu catálogo regularmente.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <h2 className="text-sm font-semibold text-white">Como vender mais</h2>
        <span className="ml-auto text-xs text-slate-500">{recommendations.length} sugestões</span>
      </div>
      <div className="space-y-2">
        {recommendations.map((rec) => {
          const style = STYLE[rec.priority];
          const href = ACTION_HREF[rec.type];
          const ctaLabel = ACTION_LABEL[rec.type];
          return (
            <div
              key={rec.id}
              className={`rounded-lg border px-3 py-3 ${style.border}`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full ${style.dot} mt-1.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{style.label}</span>
                  </div>
                  <p className="text-sm font-medium text-white leading-snug">{rec.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{rec.body}</p>
                  {href && (
                    <Link href={href} className="inline-block mt-2 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                      {ctaLabel} →
                    </Link>
                  )}
                </div>
                {onDismiss && (
                  <button
                    onClick={() => onDismiss(rec.id)}
                    className="text-slate-700 hover:text-slate-500 transition-colors shrink-0 mt-0.5"
                    aria-label="Dispensar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
