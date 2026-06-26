import { CheckCircle2, XCircle } from "lucide-react";
import type { MerchantScoreBreakdown, MerchantLevel } from "@/types/merchant";

interface Props {
  score: MerchantScoreBreakdown;
  level: MerchantLevel;
}

export function ScoreCard({ score, level }: Props) {
  const progressInLevel = level.max === level.min
    ? 100
    : Math.round(((score.total - level.min) / (level.max - level.min)) * 100);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Merchant Score</h2>
          <p className="text-xs text-slate-500 mt-0.5">Saúde da sua loja no ParaguAI</p>
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-1 justify-end">
            <span className={`text-3xl font-bold ${level.color}`}>{score.total}</span>
            <span className="text-slate-500 text-sm">/100</span>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 ${level.color}`}>
            {level.name}
          </span>
        </div>
      </div>

      {/* Progress bar within current level */}
      <div className="mb-1">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{level.name}</span>
          {level.next && <span>{level.next} em {level.pointsToNext} pts</span>}
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${level.bgColor}`}
            style={{ width: `${progressInLevel}%` }}
          />
        </div>
      </div>

      {/* Level ladder */}
      <div className="flex items-center gap-1 mb-4 mt-3">
        {(["Iniciante","Bronze","Prata","Ouro","Diamante","Elite"] as const).map((name) => (
          <div
            key={name}
            className={`flex-1 h-1 rounded-full text-center ${
              name === level.name ? "bg-emerald-500" : score.total >= { Iniciante:0, Bronze:21, Prata:41, Ouro:61, Diamante:81, Elite:96 }[name] ? "bg-slate-600" : "bg-slate-800"
            }`}
          />
        ))}
      </div>

      <div className="space-y-2">
        {score.items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {item.earned
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                : <XCircle className="w-3.5 h-3.5 text-slate-700 shrink-0" />}
              <span className={item.earned ? "text-slate-300" : "text-slate-600"}>{item.label}</span>
            </div>
            <span className={item.earned ? "text-emerald-400 font-medium" : "text-slate-700"}>
              +{item.points}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
