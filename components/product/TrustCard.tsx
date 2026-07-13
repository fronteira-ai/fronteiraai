import type { TrustCardResult } from "@/src/domains/buyer-intelligence";

type Props = {
  trust: TrustCardResult | null;
};

// Release 2.0 — Wave 4 (Experience Iteration 4 — Trust Experience). Every
// signal rendered here is TrustComposer's own output — this component
// formats, it never decides. See docs/product/TRUST_DECISION_ARCHITECTURE.md
// for the full signal inventory and every documented "informação
// indisponível" case.
export default function TrustCard({ trust }: Props) {
  if (!trust) return null;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>🛡️</span>
        <h3 className="text-lg font-bold text-white">
          {trust.isVerified ? "Loja verificada" : "Confiança da loja"}
        </h3>
      </div>

      {trust.signals.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-1.5 text-sm text-slate-300">
          {trust.signals.map((signal, i) => (
            <li key={`${signal.factor}-${i}`} className="flex items-start gap-2">
              <span className="text-slate-500">•</span>
              <span>
                <span className="font-medium text-white">{signal.label}</span> — {signal.evidence}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Informação indisponível para esta loja.</p>
      )}

      {trust.limitations.length > 0 ? (
        <div className="mt-4 border-t border-slate-800 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">⚠️ Limitações conhecidas</p>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-slate-500">
            {trust.limitations.map((limitation, i) => (
              <li key={i}>{limitation}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
