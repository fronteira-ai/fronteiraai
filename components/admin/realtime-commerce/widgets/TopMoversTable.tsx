import type { TopMover } from "@/src/domains/realtime-commerce";

export function TopMoversTable({ movers }: { movers: TopMover[] | null }) {
  if (!movers || movers.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-500">
        Nenhuma mudança de preço relevante hoje.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
            <th className="text-left p-3">Produto</th>
            <th className="text-left p-3">Loja</th>
            <th className="text-right p-3">Antes</th>
            <th className="text-right p-3">Depois</th>
            <th className="text-right p-3">Variação</th>
          </tr>
        </thead>
        <tbody>
          {movers.map((m, i) => (
            <tr key={`${m.productId}-${i}`} className="border-b border-slate-800/50 last:border-0">
              <td className="p-3 text-slate-200">{m.productName}</td>
              <td className="p-3 text-slate-400">{m.storeName ?? "—"}</td>
              <td className="p-3 text-right text-slate-500">{m.previousValue}</td>
              <td className="p-3 text-right text-slate-300">{m.currentValue}</td>
              <td className={`p-3 text-right font-medium ${m.percentChange < 0 ? "text-emerald-400" : "text-red-400"}`}>
                {m.percentChange > 0 ? "+" : ""}
                {(m.percentChange * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
