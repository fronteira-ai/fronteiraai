import { Store as StoreIcon, Star } from "lucide-react";
import DashboardCardShell from "./dashboard/DashboardCardShell";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getFeaturedStores } from "@/lib/home-premium-service";
import { lojaPath } from "@/constants/routes";

const AVATAR_GRADIENTS = [
  "from-sky-500 to-blue-600",
  "from-red-500 to-rose-600",
  "from-amber-400 to-orange-500",
  "from-indigo-500 to-blue-700",
  "from-brand-purple to-blue-700",
  "from-rose-500 to-pink-600",
] as const;

function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length === 1 ? words[0].slice(0, 2).toUpperCase() : (words[0][0] + words[1][0]).toUpperCase();
}

function gradientFor(name: string): string {
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

// Release 1.9 — Program F — Wave 2 (v0 realignment). Moved out of the Hero
// into its own dashboard card (matches v0's FeaturedStoresCard) — same
// MerchantPriorityService ranking as before, no fabricated entries.
// `rating` now comes directly off getFeaturedStores() (home-premium-service),
// which removes the second getStoreBySlug() call per store this component
// used to make on its own (HOME_AUDIT_2026_07_06.md §2).
export default async function StoreCarousel() {
  const client = getSupabaseServiceClient();
  const stores = await getFeaturedStores(client);

  if (stores.length === 0) return null;

  return (
    <DashboardCardShell icon={<StoreIcon size={16} />} title="Lojas em destaque" hrefLabel="Ver todas as lojas" href="/lojas">
      <div className="grid h-full grid-cols-3 content-center gap-3 sm:grid-cols-6">
        {stores.map((s) => (
          <a
            key={s.slug}
            href={lojaPath(s.slug)}
            className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-2.5 text-center transition-colors hover:bg-white/10"
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br font-home-display text-[11px] font-bold text-white ${gradientFor(s.name)}`}
            >
              {initials(s.name)}
            </span>
            <p className="mt-1.5 line-clamp-1 text-[11px] font-semibold leading-tight text-white">{s.name}</p>
            {s.rating > 0 ? (
              <p className="mt-1.5 flex items-center justify-center gap-1 text-xs font-semibold text-amber">
                {s.rating.toFixed(1)}
                <Star size={12} className="fill-amber text-amber" />
              </p>
            ) : null}
            <p className="mt-1 text-[11px] text-slate-500">{s.offerCount.toLocaleString("pt-BR")} ofertas</p>
          </a>
        ))}
      </div>
    </DashboardCardShell>
  );
}
