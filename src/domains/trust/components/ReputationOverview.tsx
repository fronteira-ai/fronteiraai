import type { MerchantPublicProfile } from "../types/trust.types";
import { TrustSummary } from "./TrustSummary";
import { Shield, ShieldCheck, Star, Clock } from "lucide-react";

interface Props {
  profile: MerchantPublicProfile;
}

export function ReputationOverview({ profile }: Props) {
  const { trustSummary } = profile;

  const lastVerified = trustSummary.lastVerifiedAt
    ? new Date(trustSummary.lastVerifiedAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : null;

  return (
    <section
      className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-6"
      aria-labelledby="reputation-heading"
    >
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-5 h-5 text-cyan-400" aria-hidden="true" />
        <h2 id="reputation-heading" className="text-base font-semibold text-white">Reputação</h2>
      </div>

      <TrustSummary summary={trustSummary} />

      <dl className="mt-4 space-y-2.5">
        <div className="flex items-center justify-between text-sm">
          <dt className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            Verificações
          </dt>
          <dd className="font-medium text-white">{trustSummary.activeSignalCount}</dd>
        </div>

        {trustSummary.averageRating !== null && (
          <div className="flex items-center justify-between text-sm">
            <dt className="flex items-center gap-2 text-slate-400">
              <Star className="w-4 h-4" aria-hidden="true" />
              Nota média
            </dt>
            <dd className="font-medium text-yellow-400">
              {trustSummary.averageRating}/5
              <span className="text-slate-500 font-normal ml-1">({trustSummary.reviewCount})</span>
            </dd>
          </div>
        )}

        {lastVerified && (
          <div className="flex items-center justify-between text-sm">
            <dt className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4" aria-hidden="true" />
              Última verificação
            </dt>
            <dd className="text-slate-300">{lastVerified}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
