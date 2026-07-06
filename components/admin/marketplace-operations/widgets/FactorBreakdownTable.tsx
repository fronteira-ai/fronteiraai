import { AdminDataTable, type Column } from "@/components/admin/ui/AdminDataTable";
import type { FactorScore } from "@/src/domains/marketplace-operations/types";

const FACTOR_LABELS: Record<string, string> = {
  connector_health: "Saúde dos Conectores",
  freshness: "Frescor",
  coverage: "Cobertura",
  canonical_catalog: "Canonical Catalog",
  discovery: "Discovery",
  claims: "Claims",
  analytics_brain_volume: "Analytics / Brain",
  connector_errors: "Erros de Conector",
};

export function FactorBreakdownTable({ factors }: { factors: FactorScore[] }) {
  const cols: Column<FactorScore>[] = [
    { key: "factor", header: "Fator", render: (f) => FACTOR_LABELS[f.factor] ?? f.factor },
    { key: "weight", header: "Peso", render: (f) => `${f.weight}%` },
    {
      key: "score",
      header: "Score",
      render: (f) => (
        <span className={f.score >= 80 ? "text-emerald-400" : f.score >= 50 ? "text-amber-400" : "text-red-400"}>
          {f.score}/100
        </span>
      ),
    },
    { key: "weightedScore", header: "Contribuição", render: (f) => `+${f.weightedScore}` },
    { key: "detail", header: "Detalhe", className: "max-w-md text-xs text-slate-500" },
  ];

  return <AdminDataTable columns={cols} data={factors} keyField="factor" emptyMessage="Nenhum fator computado." />;
}
