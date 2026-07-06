import type { ExchangeRate } from "@/src/domains/exchange/types/Money";

const PAIR_LABELS: Record<string, string> = {
  "USD/PYG": "Dólar → Guarani",
  "USD/BRL": "Dólar → Real",
  "BRL/PYG": "Real → Guarani",
};

export function RateCard({ rates }: { rates: ExchangeRate[] | null }) {
  if (!rates || rates.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-500">
        Nenhuma cotação disponível ainda.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {rates.map((rate) => (
        <div key={rate.pair} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-500 text-xs uppercase tracking-wide">{PAIR_LABELS[rate.pair] ?? rate.pair}</p>
          <p className="text-white text-2xl font-semibold mt-1">{rate.rate.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}</p>
          <p className="text-slate-600 text-xs mt-1">
            {rate.source} · {new Date(rate.capturedAt).toLocaleString("pt-BR")}
          </p>
        </div>
      ))}
    </div>
  );
}
