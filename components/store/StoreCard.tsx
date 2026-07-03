"use client";

import { memo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import { Store } from "@/types/store";
import { animations } from "@/styles/animations";
import { lojaPath } from "@/constants/routes";
import { analytics } from "@/utils/analytics";

type Props = {
  store: Store;
  productCount?: number;
};

function StoreCard({ store, productCount }: Props) {
  const handleClick = useCallback(() => {
    analytics.viewStore(store.slug, store.name);
  }, [store.slug, store.name]);

  return (
    <Link
      href={lojaPath(store.slug)}
      onClick={handleClick}
      className={`group flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 ${animations.cardHover}`}
    >
      <div className="relative flex h-48 w-full items-center justify-center overflow-hidden bg-slate-950">
        {store.cover_image ? (
          <Image
            src={store.cover_image}
            alt={store.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-4xl font-black text-slate-700">
            {store.name.charAt(0)}
          </span>
        )}
      </div>

      <div className="p-7">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-2xl font-bold text-white">{store.name}</h3>

          {store.is_verified ? (
            <span
              className={`shrink-0 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 ${animations.pulseSoft}`}
            >
              Verificada
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
          <MapPin size={14} />
          {store.city}, {store.country}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="flex items-center gap-1 rounded-full bg-blue-500/20 px-4 py-2 text-sm text-blue-300">
            <Star size={14} fill="currentColor" />
            {store.rating.toFixed(1)}
          </span>

          {productCount !== undefined ? (
            <span className="text-sm text-slate-400">
              {productCount.toLocaleString("pt-BR")} produtos
            </span>
          ) : null}
        </div>

        <span className="mt-8 block w-full rounded-2xl bg-blue-600 py-3 text-center font-semibold text-white transition group-hover:bg-blue-500">
          Ver Loja
        </span>
      </div>
    </Link>
  );
}

export default memo(StoreCard);
