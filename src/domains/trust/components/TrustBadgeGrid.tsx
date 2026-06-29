import type { TrustSignalRecord } from "../types/trust.types";
import { TrustSignalCard } from "./TrustSignalCard";

interface Props {
  signals: TrustSignalRecord[];
  compact?: boolean;
  emptyMessage?: string;
}

export function TrustBadgeGrid({ signals, compact = false, emptyMessage = "Nenhum sinal de confiança ativo." }: Props) {
  if (signals.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic py-4" role="status">
        {emptyMessage}
      </p>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2" role="list" aria-label="Sinais de confiança">
        {signals.map((signal) => (
          <div key={signal.id} role="listitem">
            <TrustSignalCard signal={signal} compact />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      role="list"
      aria-label="Sinais de confiança"
    >
      {signals.map((signal) => (
        <div key={signal.id} role="listitem">
          <TrustSignalCard signal={signal} />
        </div>
      ))}
    </div>
  );
}
