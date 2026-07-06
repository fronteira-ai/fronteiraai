export function ConversionsCounterCard({ conversionsToday }: { conversionsToday: number | null }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-slate-500 text-xs uppercase tracking-wide">Conversões hoje</p>
      <p className="text-white text-3xl font-semibold mt-1">{conversionsToday ?? "—"}</p>
      <p className="text-slate-600 text-xs mt-2">
        Contagem de chamadas a POST /api/exchange/convert desde 00:00 (exchange_conversion_log).
      </p>
    </div>
  );
}
