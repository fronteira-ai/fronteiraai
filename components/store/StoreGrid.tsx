import { memo } from "react";
import { Store } from "@/types/store";
import StoreCard from "@/components/store/StoreCard";

type Props = {
  stores: Store[];
  title?: string;
};

function StoreGrid({ stores, title = "Outras lojas" }: Props) {
  if (stores.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>
    </section>
  );
}

export default memo(StoreGrid);
