import type { BestDealResult } from "@/src/domains/buyer-intelligence";
import type { MoneyPresentation, MoneySavingsPresentation } from "@/src/domains/exchange";

type Props = {
  bestDeal: BestDealResult | null;
  storeName: string;
  /** Program ΔR — Mission ΔR-1.2. Produced by PricePresentationService —
   * this component never calls formatUSD/formatBRL or converts currency
   * itself. */
  price: MoneyPresentation | null;
  savings: MoneySavingsPresentation | null;
  /** Compact mode (search results): headline + economia only, no reason
   * list/near-tie banner — same data, less real estate. */
  compact?: boolean;
};

// Release 2.0 — Wave 2 (Experience Iteration 2 — Best Deal). Every value
// rendered here comes straight from BestDealComposer's output, which in
// turn only reads CompareFoundationService/OfferRankingService (Canonical
// Catalog), PriceIntelligenceService (Market Intelligence), FreshnessService
// (Real-Time Commerce), trust badges, and ExchangeRateService — no number
// on this card is computed by this component. See
// docs/product/WHY_THIS_RECOMMENDATION.md for the full explanation of each
// field's origin.
export default function BestDealCard({ bestDeal, storeName, price, savings, compact = false }: Props) {
  if (!bestDeal) return null;

  const { recommendedOffer, priceStatistics, nearTie, reasons, totalOffers } = bestDeal;
  const offer = recommendedOffer.offer;

  const priceVsMedian =
    priceStatistics && priceStatistics.medianPriceUSD > 0
      ? ((offer.priceUSD - priceStatistics.medianPriceUSD) / priceStatistics.medianPriceUSD) * 100
      : null;

  return (
    <div className="rounded-3xl border border-blue-500/30 bg-blue-500/5 p-6">
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>🏆</span>
        <h3 className="text-lg font-bold text-white">Melhor compra agora</h3>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-black text-white">{price?.formattedUSD ?? "—"}</span>
        {price?.formattedBRL ? <span className="text-lg font-semibold text-slate-400">≈ {price.formattedBRL}</span> : null}
        <span className="text-sm text-slate-400">
          ⭐ <span className="font-semibold text-slate-200">{storeName}</span>
        </span>
      </div>

      {savings && savings.amountUSD > 0 ? (
        <p className="mt-2 text-sm font-semibold text-emerald-300">
          💰 Economize até {savings.formattedUSD}
          {savings.formattedBRL ? ` (≈ ${savings.formattedBRL})` : ""} ({savings.formattedPercent}) — 💵 economia estimada comparando {totalOffers} oferta{totalOffers !== 1 ? "s" : ""}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {recommendedOffer.isVerifiedStore ? (
          <span className="rounded-full bg-blue-500/20 px-3 py-1 font-semibold text-blue-300">🛡️ Loja verificada</span>
        ) : null}
        {priceVsMedian !== null ? (
          <span className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-300">
            📈 {priceVsMedian < 0 ? `${Math.abs(priceVsMedian).toFixed(0)}% abaixo da mediana` : "Preço dentro da média do mercado"}
          </span>
        ) : null}
        <span className={`rounded-full px-3 py-1 font-semibold ${offer.inStock ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
          📦 {offer.inStock ? "Em estoque" : "Sem estoque"}
        </span>
        {recommendedOffer.freshness ? (
          <span className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-300">
            ⏱ Atualizado {new Date(offer.updatedAt).toLocaleDateString("pt-BR")}
          </span>
        ) : null}
        {price?.formattedRate ? (
          <span className={`rounded-full px-3 py-1 font-semibold ${price.isStale ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-300"}`}>
            🌎 {price.formattedRate} — {price.formattedTimestamp}
          </span>
        ) : null}
      </div>

      {!compact ? (
        <>
          <div className="mt-5 border-t border-slate-800 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Esta loja foi recomendada porque:</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-slate-300">
              {reasons.map((reason) => (
                <li key={reason.factor} className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>
                    <span className="font-medium text-white">{reason.label}</span> — {reason.evidence}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {nearTie?.isNearTie ? (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              Duas ofertas apresentam excelente custo-benefício.
              {nearTie.differentiatingFactor
                ? ` A diferença principal está em: ${nearTie.differentiatingFactor.label.toLowerCase()} (${nearTie.differentiatingFactor.evidence}).`
                : ""}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
