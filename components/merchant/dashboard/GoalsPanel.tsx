import type { MerchantGoal } from "@/types/merchant";

interface Props {
  goals: MerchantGoal[];
}

export function GoalsPanel({ goals }: Props) {
  const achieved = goals.filter((g) => g.achieved).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Metas</h2>
        <span className="text-xs text-slate-500">
          {achieved}/{goals.length} concluídas
        </span>
      </div>

      <div className="space-y-3">
        {goals.map((goal) => (
          <div key={goal.id} className={`rounded-lg p-3 ${goal.achieved ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-slate-800/50"}`}>
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none mt-0.5">{goal.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className={`text-xs font-semibold ${goal.achieved ? "text-emerald-400" : "text-slate-300"}`}>
                    {goal.label}
                    {goal.achieved && <span className="ml-1.5 text-emerald-500">✓</span>}
                  </p>
                  <span className="text-xs text-slate-500 shrink-0">
                    {goal.current.toLocaleString("pt-BR")}/{goal.target.toLocaleString("pt-BR")}
                  </span>
                </div>
                {!goal.achieved && (
                  <>
                    <div className="w-full bg-slate-700 rounded-full h-1.5 mb-1">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">{goal.description}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
