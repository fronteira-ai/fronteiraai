import Link from "next/link";
import { Star } from "lucide-react";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getFeaturedStores } from "@/lib/home-premium-service";
import { lojaPath } from "@/constants/routes";
import { getStoreBySlug } from "@/services/store.service";

// Release 1.9 — Program F — Wave 1 (revision). A horizontal chip row right
// under the search bar, per the CTO's refined reference — same data as
// FeaturesStores.tsx (MerchantPriorityService ranking, no fabricated
// entries), just a denser presentation for the Hero itself.
export default async function StoreCarousel() {
  const client = getSupabaseServiceClient();
  const featured = await getFeaturedStores(client);

  const stores = await Promise.all(
    featured.map(async (f) => {
      const store = await getStoreBySlug(f.slug);
      return store ? { store, highlight: f } : null;
    })
  );
  const validStores = stores.filter((s): s is NonNullable<typeof s> => s !== null);

  if (validStores.length === 0) return null;

  return (
    <div className="mt-8 w-full max-w-5xl">
      <p className="mb-3 text-xs font-bold uppercase tracking-[2px] text-slate-500">Lojas em destaque</p>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {validStores.map(({ store, highlight }) => (
          <Link
            key={store.id}
            href={lojaPath(store.slug)}
            className="flex shrink-0 flex-col items-start gap-1 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 transition-colors hover:border-blue-500/50 hover:bg-slate-800/60"
          >
            <span className="text-sm font-bold text-white">{store.name}</span>
            <span className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1 text-amber-400">
                <Star size={11} fill="currentColor" />
                {store.rating.toFixed(1)}
              </span>
              <span>{highlight.offerCount.toLocaleString("pt-BR")} ofertas</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
