import type { StoreUpdateProfile } from "@/src/domains/realtime-commerce";

export function StoreRankingTable({ stores }: { stores: StoreUpdateProfile[] | null }) {
  if (!stores || stores.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-500">
        Nenhuma loja com atividade suficiente hoje para ranquear.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
            <th className="text-left p-3">#</th>
            <th className="text-left p-3">Loja</th>
            <th className="text-right p-3">Update Score</th>
            <th className="text-right p-3">Intervalo médio</th>
            <th className="text-right p-3">Reação (h)</th>
            <th className="text-right p-3">Estabilidade</th>
            <th className="text-right p-3">Responsividade</th>
          </tr>
        </thead>
        <tbody>
          {stores.map((s) => (
            <tr key={s.storeId} className="border-b border-slate-800/50 last:border-0">
              <td className="p-3 text-slate-500">{s.rank}</td>
              <td className="p-3 text-slate-200">{s.storeName}</td>
              <td className="p-3 text-right text-white font-medium">{s.updateScore}</td>
              <td className="p-3 text-right text-slate-400">
                {s.avgUpdateIntervalMinutes !== null ? `${s.avgUpdateIntervalMinutes} min` : "—"}
              </td>
              <td className="p-3 text-right text-slate-400">
                {s.priceReactionSpeedHours !== null ? s.priceReactionSpeedHours.toFixed(1) : "—"}
              </td>
              <td className="p-3 text-right text-slate-400">{s.catalogStability}</td>
              <td className="p-3 text-right text-slate-400">{s.marketResponsiveness}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
