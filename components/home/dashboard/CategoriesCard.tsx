import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import DashboardCardShell from "./DashboardCardShell";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getTopCategories } from "@/lib/home-premium-service";
import { productsPath } from "@/constants/routes";

const CARD_LIMIT = 8;

// Compact strip version of Categories.tsx — same MarketplaceCoverageService
// counts, shown as a dense icon grid instead of large cards; "Ver todas"
// still points at /categorias, never listing every category here.
export default async function CategoriesCard() {
  const client = getSupabaseServiceClient();
  const categories = (await getTopCategories(client)).slice(0, CARD_LIMIT);

  return (
    <DashboardCardShell icon={<LayoutGrid size={16} />} title="Categorias principais" href="/categorias">
      <div className="grid grid-cols-4 gap-2">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={productsPath({ category: category.slug })}
            className="flex flex-col items-center gap-1 rounded-xl p-2 text-center transition-colors hover:bg-slate-800/60"
          >
            <span className="text-xl">{category.icon ?? "🛍️"}</span>
            <span className="line-clamp-1 text-[11px] text-slate-400">{category.name}</span>
          </Link>
        ))}
      </div>
    </DashboardCardShell>
  );
}
