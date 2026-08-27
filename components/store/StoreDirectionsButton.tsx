import Link from "next/link";
import { MapPin } from "lucide-react";
import { buildGoogleMapsDirectionsUrl, canBuildRoute, DIRECTIONS_CTA_LABEL } from "@/utils/maps";
import type { Store } from "@/types/store";

type Props = {
  store: Pick<Store, "name" | "city" | "country" | "address" | "latitude" | "longitude">;
  /** Classe de estilo do CTA (reusa Button/CTA do Design System). */
  className?: string;
  compact?: boolean;
};

/**
 * CTA "Como chegar" (PR-005) — abre Google Maps com rota:
 * Ponte Internacional da Amizade → loja.
 *
 * Hierarquia UX preservada (PR-005 ETAPA 10): é um link secundário, não
 * compete com preço/compra. Não renderiza nada quando a loja não tem
 * identificador navegável (nunca inventa coordenada/destino).
 */
export default function StoreDirectionsButton({ store, className = "", compact = false }: Props) {
  if (!canBuildRoute(store)) return null;

  const url = buildGoogleMapsDirectionsUrl(store);
  if (!url) return null;

  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${DIRECTIONS_CTA_LABEL}: ${store.name}`}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-500 hover:text-white ${compact ? "text-xs px-3 py-1.5" : ""} ${className}`}
    >
      <MapPin size={compact ? 13 : 15} className="text-brand-cyan" />
      {DIRECTIONS_CTA_LABEL}
    </Link>
  );
}
