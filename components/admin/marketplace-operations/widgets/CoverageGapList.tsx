import type { CoverageSnapshot } from "@/src/domains/marketplace-operations/types";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
      <p className="text-slate-500 text-xs">{label}</p>
      <p className="text-white text-xl font-semibold">{value}</p>
    </div>
  );
}

export function CoverageGapList({ coverage }: { coverage: CoverageSnapshot | null }) {
  if (!coverage) {
    return <div className="text-sm text-slate-500">Cobertura indisponível agora.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Total de Lojas" value={coverage.totalStores} />
        <Stat label="Descobertas" value={coverage.discoveredStores} />
        <Stat label="Sincronizadas" value={coverage.syncedStores} />
        <Stat label="Reivindicadas" value={coverage.claimedStores} />
        <Stat label="Bootstrap Canonical (%)" value={coverage.canonicalBootstrapPct} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-2">
          Categorias e marcas com baixa cobertura ({coverage.gaps.length})
        </h3>
        {coverage.gaps.length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhum gap de cobertura detectado.</p>
        ) : (
          <ul className="space-y-1">
            {coverage.gaps.map((gap) => (
              <li
                key={`${gap.dimension}-${gap.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
              >
                <span className="text-slate-300">
                  <span className="text-slate-500 text-xs uppercase mr-2">
                    {gap.dimension === "brand" ? "Marca" : "Categoria"}
                  </span>
                  {gap.name}
                </span>
                <span className="text-amber-400 text-xs">{gap.productCount} produto(s)</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-slate-600">
        Cobertura por segmento e faixa de preço ainda não é reportada — não existe coluna de segmento em `stores`
        (gap documentado em docs/engineering/TECH_DEBT.md).
      </p>
    </div>
  );
}
