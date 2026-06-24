import { memo } from "react";
import { OfferWithStore } from "@/types/offer";
import { formatUSD, formatBRL } from "@/utils/currency";

type Props = {
  offers: OfferWithStore[];
};

function ProductOffers({ offers }: Props) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">

      <h2 className="text-2xl font-bold text-white">
        Ofertas ({offers.length})
      </h2>

      {offers.length === 0 ? (
        <p className="mt-4 text-slate-400">
          Ainda não encontramos lojas vendendo este produto. Volte em breve —
          novas ofertas são adicionadas com frequência.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">

          {offers.map((offer) => (
            <div
              key={offer.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-6 sm:flex-row sm:items-center sm:justify-between"
            >

              <div>
                <p className="text-lg font-bold text-white">
                  {offer.store?.name ?? "Loja"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-sm">

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

                  {offer.cashback ? (
                    <span className="rounded-full bg-blue-500/20 px-3 py-1 text-blue-300">
                      {offer.cashback}% de cashback
                    </span>
                  ) : null}

                </div>
              </div>

              <div className="text-right">

                <p className="text-2xl font-black text-white">
                  {formatUSD(offer.price_usd)}
                </p>

                <p className="text-sm text-slate-400">
                  {formatBRL(offer.price_brl)}
                </p>

                {offer.product_url ? (
                  <a
                    href={offer.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    Ver oferta
                  </a>
                ) : null}

              </div>

            </div>
          ))}

        </div>
      )}

    </section>
  );
}

export default memo(ProductOffers);
