import Link from "next/link";
import {
  LayoutGrid,
  Smartphone,
  Laptop,
  Gamepad2,
  Tv,
  SprayCan,
  House,
  Watch,
  Camera,
  Shirt,
  ShoppingBag,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import DashboardCardShell from "./DashboardCardShell";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getTopCategories } from "@/lib/home-premium-service";
import { productsPath } from "@/constants/routes";

// Release 1.9 — Program F — Wave 2 (v0 realignment). The v0 card uses colored
// lucide icons instead of the raw emoji from `category.icon` — there's no
// icon-family field on the real category row, so this is a presentational
// keyword lookup over the real category name (same spirit as the existing
// "🛍️" fallback), never a substitute for real category data. Unmatched
// categories fall back to a generic icon rather than a guess.
const ICON_RULES: { match: RegExp; icon: LucideIcon; color: string }[] = [
  { match: /celular|smartphone|iphone/i, icon: Smartphone, color: "text-brand-cyan" },
  { match: /inform[aá]tica|notebook|computador|laptop/i, icon: Laptop, color: "text-brand-blue" },
  { match: /game|jogo|console/i, icon: Gamepad2, color: "text-brand-purple" },
  { match: /tv|áudio|audio|som/i, icon: Tv, color: "text-positive" },
  { match: /perfum/i, icon: SprayCan, color: "text-brand-purple" },
  { match: /casa|decora[cç][aã]o|m[oó]veis/i, icon: House, color: "text-brand-cyan" },
  { match: /rel[oó]gio|watch/i, icon: Watch, color: "text-brand-blue" },
  { match: /c[aâ]mera|foto/i, icon: Camera, color: "text-positive" },
  { match: /moda|roupa|vestu[aá]rio|cal[cç]ado/i, icon: Shirt, color: "text-amber" },
];

function iconFor(name: string): { icon: LucideIcon; color: string } {
  const rule = ICON_RULES.find((r) => r.match.test(name));
  return rule ? { icon: rule.icon, color: rule.color } : { icon: ShoppingBag, color: "text-slate-400" };
}

export default async function CategoriesCard() {
  const client = getSupabaseServiceClient();
  const categories = await getTopCategories(client);

  return (
    <DashboardCardShell icon={<LayoutGrid size={16} />} title="Categorias principais" href="/categorias">
      <div className="grid h-full grid-cols-5 content-center gap-3">
        {categories.map((category) => {
          const { icon: Icon, color } = iconFor(category.name);
          return (
            <Link
              key={category.id}
              href={productsPath({ category: category.slug })}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-center transition-colors hover:bg-white/10"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-black/20 ${color}`}>
                <Icon size={18} />
              </span>
              <span className="line-clamp-1 text-[11px] font-medium text-white">{category.name}</span>
            </Link>
          );
        })}
        <Link
          href="/categorias"
          className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-center transition-colors hover:bg-white/10"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/20 text-slate-400">
            <MoreHorizontal size={18} />
          </span>
          <span className="line-clamp-1 text-[11px] font-medium text-slate-400">Mais</span>
        </Link>
      </div>
    </DashboardCardShell>
  );
}
