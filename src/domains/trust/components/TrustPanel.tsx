import type { MerchantPublicProfile } from "../types/trust.types";
import { TrustBadgeGrid } from "./TrustBadgeGrid";
import { Shield, Star } from "lucide-react";

interface Props {
  profile: MerchantPublicProfile;
}

export function TrustPanel({ profile }: Props) {
  const { trustSummary, activeSignals } = profile;

  return (
    <section
      className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 space-y-6"
      aria-labelledby="trust-panel-heading"
    >
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-cyan-400" aria-hidden="true" />
        <h2 id="trust-panel-heading" className="text-lg font-semibold text-white">
          Confiança & Verificação
        </h2>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-cyan-400" aria-label={`Score de confiança: ${trustSummary.trustScore}`}>
            {trustSummary.trustScore}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Score</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-emerald-400" aria-label={`${trustSummary.activeSignalCount} sinais ativos`}>
            {trustSummary.activeSignalCount}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Sinais</p>
        </div>
        <div>
          {trustSummary.averageRating !== null ? (
            <>
              <p className="text-2xl font-bold text-yellow-400 flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400" aria-hidden="true" />
                <span aria-label={`Nota média: ${trustSummary.averageRating}`}>{trustSummary.averageRating}</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{trustSummary.reviewCount} avaliações</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-slate-500">—</p>
              <p className="text-xs text-slate-400 mt-0.5">Avaliações</p>
            </>
          )}
        </div>
      </div>

      {/* Signals */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3">Verificações ativas</h3>
        <TrustBadgeGrid signals={activeSignals} compact />
      </div>
    </section>
  );
}
