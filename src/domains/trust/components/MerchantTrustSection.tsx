import { ShieldOff } from "lucide-react";
import type { TrustSignalRecord } from "../types/trust.types";
import { TrustExplainabilityCard } from "./TrustExplainabilityCard";

interface Props {
  signals: TrustSignalRecord[];
}

export function MerchantTrustSection({ signals }: Props) {
  return (
    <section aria-labelledby="trust-section-heading" className="space-y-6">
      <div>
        <h2 id="trust-section-heading" className="text-lg font-semibold text-white mb-1">
          Trust & Verificação
        </h2>
        <p className="text-sm text-slate-400">
          Cada selo abaixo possui uma explicação sobre por que existe, quem verificou e qual evidência o suporta.
        </p>
      </div>

      {signals.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            Sinais verificados ({signals.length})
          </h3>
          <div className="space-y-3">
            {signals.map((signal) => (
              <TrustExplainabilityCard key={signal.id} signal={signal} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700/40 bg-slate-800/20 p-8 text-center">
          <ShieldOff className="w-8 h-8 text-slate-600 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-slate-500">Nenhum sinal de confiança verificado ainda.</p>
          <p className="text-xs text-slate-600 mt-1">
            Os sinais aparecem conforme as verificações são concluídas.
          </p>
        </div>
      )}
    </section>
  );
}
