import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Props = {
  icon: React.ReactNode;
  title: string;
  href?: string;
  hrefLabel?: string;
  badge?: string;
  children: React.ReactNode;
};

// Shared chrome for every card in the dense dashboard strip (Ofertas
// Relâmpago / Market Pulse / Câmbio / Live Marketplace / Categorias) — one
// place for the header row (icon + title + "Ver todas"/live badge) so the 5
// cards read as one cohesive strip instead of 5 unrelated components.
export default function DashboardCardShell({ icon, title, href, hrefLabel, badge, children }: Props) {
  return (
    <div className="flex h-full flex-col rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{icon}</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">{title}</h3>
        </div>
        {href ? (
          <Link href={href} className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300">
            {hrefLabel ?? "Ver todas"}
            <ArrowRight size={12} />
          </Link>
        ) : badge ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
