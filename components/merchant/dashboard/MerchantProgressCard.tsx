import Link from "next/link";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import type { MerchantProfileCompletion } from "@/types/merchant";

interface Props {
  completion: MerchantProfileCompletion;
}

export function MerchantProgressCard({ completion }: Props) {
  const { percentage, doneCount, totalCount, items } = completion;
  const pendingItems = items.filter((i) => !i.done);
  const isComplete = percentage === 100;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Perfil da Loja</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isComplete
              ? "Perfil completo — parabéns!"
              : `${doneCount} de ${totalCount} etapas concluídas`}
          </p>
        </div>
        <span
          className={`text-2xl font-black ${
            isComplete ? "text-emerald-400" : percentage >= 60 ? "text-yellow-400" : "text-slate-400"
          }`}
        >
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-800 rounded-full h-2 mb-5">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${
            isComplete ? "bg-emerald-500" : percentage >= 60 ? "bg-yellow-500" : "bg-blue-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Items */}
      <div className="space-y-1.5">
        {items.map((item) => (
          item.done ? (
            <div key={item.id} className="flex items-center gap-2.5 py-1">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <span className="text-xs text-slate-500 line-through">{item.label}</span>
            </div>
          ) : (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center justify-between gap-2 py-1 group"
            >
              <div className="flex items-center gap-2.5">
                <Circle size={14} className="text-slate-600 shrink-0 group-hover:text-slate-400 transition-colors" />
                <span className="text-xs text-slate-400 group-hover:text-white transition-colors">{item.label}</span>
              </div>
              <ChevronRight size={12} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
            </Link>
          )
        ))}
      </div>

      {!isComplete && pendingItems.length > 0 && (
        <Link
          href={pendingItems[0].href}
          className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          Completar próxima etapa
          <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}
