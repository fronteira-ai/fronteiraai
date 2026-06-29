import type { MerchantPassport } from "../types/trust.types";
import { MerchantMetrics } from "./MerchantMetrics";
import { MerchantHighlights } from "./MerchantHighlights";
import { TrustSummary } from "./TrustSummary";

interface Props {
  passport: MerchantPassport;
}

export function MerchantOverview({ passport }: Props) {
  const { insights, reviewStats, activeSignals, trustSummary } = passport;

  return (
    <section aria-labelledby="overview-heading" className="space-y-6">
      <div>
        <h2 id="overview-heading" className="text-lg font-semibold text-white mb-1">
          Visão Geral
        </h2>
        <p className="text-sm text-slate-400">
          Resumo do perfil, verificações e histórico de atividade na plataforma.
        </p>
      </div>

      <MerchantHighlights
        insights={insights}
        activeSignals={activeSignals}
        activeBadge={trustSummary.activeBadge}
      />

      <MerchantMetrics insights={insights} reviewStats={reviewStats} />

      <TrustSummary summary={trustSummary} />
    </section>
  );
}
