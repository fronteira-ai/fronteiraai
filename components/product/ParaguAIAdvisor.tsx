import { formatUSD } from "@/utils/currency";
import type { ParaguAIAdvisorResult } from "@/src/domains/buyer-intelligence";

type Props = {
  advisor: ParaguAIAdvisorResult | null;
};

const RECOMMENDATION_STYLE: Record<ParaguAIAdvisorResult["recommendation"], { border: string; bg: string; text: string }> = {
  buy_now: { border: "border-emerald-500/30", bg: "bg-emerald-500/5", text: "text-emerald-300" },
  good_deal_caution: { border: "border-amber-500/30", bg: "bg-amber-500/5", text: "text-amber-300" },
  wait: { border: "border-red-500/30", bg: "bg-red-500/5", text: "text-red-300" },
  insufficient_data: { border: "border-slate-700", bg: "bg-slate-900/60", text: "text-slate-400" },
};

// Release 2.0 — Fase 2 — Wave 5 (EI-5 — ParaguAI Advisor). Every value here
// is read from BestDealResult/PurchaseTimingResult/TrustCardResult via
// ParaguAIAdvisorComposer — this component formats, it never decides. See
// docs/product/PARAGUAI_ADVISOR_ARCHITECTURE.md.
export default function ParaguAIAdvisor({ advisor }: Props) {
  if (!advisor) return null;

  const style = RECOMMENDATION_STYLE[advisor.recommendation];
  const { bestDeal, purchaseTiming, trust, conflicts } = advisor;
  const isInsufficient = advisor.recommendation === "insufficient_data";

  return (
    <div className={`rounded-3xl border ${style.border} ${style.bg} p-6`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>🏆</span>
        <h3 className={`text-lg font-bold ${style.text}`}>{advisor.headline}</h3>
      </div>

      {isInsufficient ? (
        <p className="mt-3 text-sm text-slate-400">
          Ainda não temos inteligência suficiente vinculada a este produto para uma recomendação — não inventamos uma decisão a partir de dados incompletos.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3 text-sm text-slate-300">
          {bestDeal?.savingsOpportunity && bestDeal.savingsOpportunity.maxSavingsUSD > 0 ? (
            <p>
              <span aria-hidden>💰</span>{" "}
              <span className="font-medium text-white">Economia estimada</span> — até{" "}
              {formatUSD(bestDeal.savingsOpportunity.maxSavingsUSD)} ({bestDeal.savingsOpportunity.maxSavingsPercent.toFixed(0)}%)
            </p>
          ) : null}

          {trust ? (
            <p>
              <span aria-hidden>🛡️</span>{" "}
              <span className="font-medium text-white">Confiança</span> —{" "}
              {trust.isVerified ? "loja verificada" : "loja ainda não verificada"}
              {trust.trustScore !== null ? ` (pontuação ${trust.trustScore}/100)` : ""}
            </p>
          ) : null}

          {bestDeal ? (
            <p>
              <span aria-hidden>📈</span>{" "}
              <span className="font-medium text-white">Melhor compra</span> — {formatUSD(bestDeal.recommendedOffer.offer.priceUSD)}
            </p>
          ) : null}

          {purchaseTiming && purchaseTiming.verdict !== "insufficient_data" ? (
            <p>
              <span aria-hidden>🕒</span>{" "}
              <span className="font-medium text-white">Vale comprar agora?</span> —{" "}
              {{ buy_now: "Sim, bom momento para comprar", can_wait: "Pode esperar", better_wait: "Melhor aguardar" }[purchaseTiming.verdict]}
            </p>
          ) : null}

          <p>
            <span aria-hidden>⭐</span>{" "}
            <span className="font-medium text-white">Resumo</span> — {advisor.headline.toLowerCase()}
          </p>
        </div>
      )}

      {conflicts.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">⚠️ Sinais conflitantes</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {conflicts.map((conflict, i) => (
              <li key={i}>
                <span className="font-semibold">{conflict.signalA} × {conflict.signalB}</span> — {conflict.explanation}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
