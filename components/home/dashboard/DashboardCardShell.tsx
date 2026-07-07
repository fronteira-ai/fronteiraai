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
    <div className="glass-card flex h-full flex-col rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-brand-cyan">{icon}</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">{title}</h3>
        </div>
        {href ? (
          <Link href={href} className="flex items-center gap-1 text-xs font-medium text-brand-cyan transition-colors hover:text-brand-blue">
            {hrefLabel ?? "Ver todas"}
            <ArrowRight size={12} />
          </Link>
        ) : badge ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-positive">
            <span className="h-1.5 w-1.5 rounded-full bg-positive animate-pulse" />
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
