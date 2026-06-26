import Link from "next/link";
import { ArrowRight, Clock, Zap, AlertCircle, TrendingUp } from "lucide-react";
import type { NextStep } from "@/types/merchant";

interface Props {
  nextStep: NextStep;
}

const URGENCY = {
  critical: {
    border: "border-red-500/40",
    bg: "bg-gradient-to-br from-red-950/60 to-slate-900",
    badge: "bg-red-500/20 text-red-400 border border-red-500/30",
    icon: <AlertCircle className="w-5 h-5 text-red-400" />,
    label: "Ação urgente",
    cta: "bg-red-600 hover:bg-red-500",
  },
  high: {
    border: "border-yellow-500/30",
    bg: "bg-gradient-to-br from-yellow-950/40 to-slate-900",
    badge: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    icon: <Zap className="w-5 h-5 text-yellow-400" />,
    label: "Recomendado hoje",
    cta: "bg-yellow-600 hover:bg-yellow-500",
  },
  medium: {
    border: "border-emerald-500/30",
    bg: "bg-gradient-to-br from-emerald-950/30 to-slate-900",
    badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
    label: "Próximo passo",
    cta: "bg-emerald-600 hover:bg-emerald-500",
  },
};

export function NextStepCard({ nextStep }: Props) {
  const style = URGENCY[nextStep.urgency];

  return (
    <div className={`rounded-xl border p-5 ${style.border} ${style.bg}`}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center shrink-0">
          {style.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
              {style.label}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              {nextStep.estimatedMinutes} min
            </span>
          </div>
          <h3 className="text-base font-bold text-white mb-1">{nextStep.title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed mb-3">{nextStep.description}</p>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              <span className="text-emerald-400 font-medium">Impacto:</span> {nextStep.benefit}
            </p>
            <Link
              href={nextStep.href}
              className={`flex items-center gap-1.5 px-4 py-2 ${style.cta} text-white text-sm font-medium rounded-lg transition-colors shrink-0`}
            >
              {nextStep.cta}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
