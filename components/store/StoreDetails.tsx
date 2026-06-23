import { memo } from "react";
import { Star, MapPin, BadgeCheck } from "lucide-react";
import { Store } from "@/types/store";

type Props = {
  store: Store;
};

function StoreDetails({ store }: Props) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="flex items-center gap-1.5 rounded-full bg-blue-500/20 px-4 py-1.5 font-medium text-blue-300">
          <Star size={14} fill="currentColor" />
          {store.rating.toFixed(1)}
        </span>

        {store.verified ? (
          <span className="flex items-center gap-1.5 rounded-full border border-slate-700 px-4 py-1.5 text-slate-300">
            <BadgeCheck size={14} />
            Loja verificada
          </span>
        ) : null}
      </div>

      <h1 className="mt-4 text-4xl font-black text-white">{store.name}</h1>

      <p className="mt-3 flex items-center gap-2 text-sm text-slate-400">
        <MapPin size={14} />
        {store.city}, {store.country}
      </p>

      <p className="mt-4 max-w-2xl leading-7 text-slate-400">
        {store.description}
      </p>
    </div>
  );
}

export default memo(StoreDetails);
