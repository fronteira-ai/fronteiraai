import { CheckCircle2, XCircle } from "lucide-react";
import type { MerchantScoreBreakdown } from "@/types/merchant";

interface Props {
  score: MerchantScoreBreakdown;
}

function scoreColor(total: number) {
  if (total >= 80) return "text-emerald-400";
  if (total >= 50) return "text-yellow-400";
  return "text-red-400";
}

function scoreLabel(total: number) {
  if (total >= 80) return "Excelente";
  if (total >= 60) return "Bom";
  if (total >= 40) return "Regular";
  return "Baixo";
}

export function ScoreCard({ score }: Props) {
  const color = scoreColor(score.total);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Merchant Score</h2>
        <div className="text-right">
          <span className={`text-3xl font-bold ${color}`}>{score.total}</span>
          <span className="text-slate-500 text-sm">/100</span>
          <p className={`text-xs font-medium mt-0.5 ${color}`}>{scoreLabel(score.total)}</p>
        </div>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all ${score.total >= 80 ? "bg-emerald-500" : score.total >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
          style={{ width: `${score.total}%` }}
        />
      </div>

      <div className="space-y-2">
        {score.items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {item.earned
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                : <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
              <span className={item.earned ? "text-slate-300" : "text-slate-500"}>{item.label}</span>
            </div>
            <span className={item.earned ? "text-emerald-400 font-medium" : "text-slate-600"}>
              +{item.points}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
