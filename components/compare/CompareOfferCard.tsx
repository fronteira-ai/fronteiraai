"use client";

import { memo, useCallback } from "react";
import { RankedOffer } from "@/types/compare";
import { formatUSD, formatBRL } from "@/utils/currency";
import { analytics } from "@/utils/analytics";

type Props = {
  rankedOffer: RankedOffer;
};

function CompareOfferCard({ rankedOffer, productSlug }: Props & { productSlug?: string }) {
  const { offer, rank, rankScore, priceMetrics } = rankedOffer;
  const store = offer.store;
  const isBest = rank === 1;

  const handleOfferClick = useCallback(() => {
    if (!offer.product_url) return;
    analytics.clickExternalOffer(
      productSlug ?? "",
      store?.name ?? "Loja",
      offer.product_url
    );
  }, [offer.product_url, productSlug, store?.name]);

  return (
    <div
      className={`rounded-2xl border p-6 transition ${
        isBest
          ? "border-blue-500/50 bg-blue-500/5"
          : "border-slate-800 bg-slate-950/40"
      }`}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">

        {/* Left: Store info + badges */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">

            {/* Rank badge */}
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                isBest
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {rank}
            </span>

            <div>
              <p className="text-lg font-bold text-white">
                {store?.name ?? "Loja"}
              </p>
              {store && (
                <div className="mt-0.5 flex items-center gap-2 text-sm text-slate-400">
                  {store.rating ? (
                    <span>★ {store.rating.toFixed(1)}</span>
                  ) : null}
                  {store.is_verified ? (
                    <span className="text-blue-400">Verificada</span>
                  ) : null}
                  {store.city ? (
                    <span>{store.city}, {store.country}</span>
                  ) : null}
                </div>
              )}
            </div>

          </div>

          {/* Offer badges */}
          <div className="mt-4 flex flex-wrap gap-2 text-sm">

            <span
              className={
                offer.in_stock
                  ? "rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-300"
                  : "rounded-full bg-red-500/20 px-3 py-1 text-red-300"
              }
            >
              {offer.in_stock ? "Em estoque" : "Sem estoque"}
            </span>

            {offer.warranty ? (
              <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-300">
                Garantia: {offer.warranty}
              </span>
            ) : null}

            {offer.condition ? (
              <span className="rounded-full border border-slate-700 px-3 py-1 text-slate-300">
                {offer.condition}
              </span>
            ) : null}

            {offer.cashback ? (
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-blue-300">
                {offer.cashback}% cashback
              </span>
            ) : null}

          </div>

          {/* Price history metrics */}
          {priceMetrics && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">

              {priceMetrics.lowestPriceUSD !== null && (
                <PriceMetricItem
                  label="Mínimo histórico"
                  value={formatUSD(priceMetrics.lowestPriceUSD)}
                  dimmed={priceMetrics.lowestPriceUSD === priceMetrics.currentPriceUSD}
                />
              )}

              {priceMetrics.highestPriceUSD !== null && (
                <PriceMetricItem
                  label="Máximo histórico"
                  value={formatUSD(priceMetrics.highestPriceUSD)}
                  dimmed={priceMetrics.highestPriceUSD === priceMetrics.currentPriceUSD}
                />
              )}

              {priceMetrics.priceChangePercent !== null && (
                <PriceMetricItem
                  label="Variação"
                  value={`${priceMetrics.priceChangePercent > 0 ? "+" : ""}${priceMetrics.priceChangePercent.toFixed(1)}%`}
                />
              )}

            </div>
          )}

        </div>

        {/* Right: Price + CTA */}
        <div className="shrink-0 text-right">

          <p className="text-3xl font-black text-white">
            {formatUSD(offer.price_usd)}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            {offer.price_brl > 0 ? formatBRL(offer.price_brl) : null}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Score: {rankScore}/100
          </p>

          {offer.product_url ? (
            <a
              href={offer.product_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOfferClick}
              className={`mt-4 inline-block rounded-full px-6 py-2.5 text-sm font-semibold text-white transition ${
                isBest
                  ? "bg-blue-600 hover:bg-blue-500"
                  : "bg-slate-700 hover:bg-slate-600"
              }`}
            >
              Ver oferta
            </a>
          ) : null}

        </div>

      </div>
    </div>
  );
}

function PriceMetricItem({
  label,
  value,
  dimmed = false,
}: {
  label: string;
  value: string;
  dimmed?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-900/60 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-semibold ${dimmed ? "text-slate-400" : "text-slate-200"}`}>
        {value}
      </p>
    </div>
  );
}

export default memo(CompareOfferCard);
