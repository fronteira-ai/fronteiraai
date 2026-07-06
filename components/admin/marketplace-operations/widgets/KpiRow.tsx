import type { MarketplaceMetricsSnapshot } from "@/src/domains/marketplace-operations/types";

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-slate-500 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-white text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

export function KpiRow({ metrics }: { metrics: MarketplaceMetricsSnapshot | null }) {
  if (!metrics) {
    return <div className="text-sm text-slate-500">Métricas indisponíveis agora.</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Tile label="Lojas" value={metrics.stores} />
      <Tile label="Produtos" value={metrics.products} />
      <Tile label="Ofertas" value={metrics.offers} />
      <Tile label="Canonical Products" value={metrics.canonicalProducts} />
      <Tile label="Cobertura" value={`${metrics.coveragePct}%`} />
      <Tile label="Taxa de Claim" value={`${metrics.claimRate}%`} />
      <Tile label="Syncs/hora" value={metrics.syncsPerHour} />
      <Tile label="Atualizações de preço/hora" value={metrics.priceUpdatesPerHour} />
      <Tile label="Sessões de comprador" value={metrics.buyerSessions} />
      <Tile label="Eventos de comprador" value={metrics.buyerEvents} />
      <Tile label="Eventos de Brain" value={metrics.brainEvents} />
      <Tile label="Relações de Conhecimento" value={metrics.knowledgeRelations ?? "não agregado"} />
    </div>
  );
}
