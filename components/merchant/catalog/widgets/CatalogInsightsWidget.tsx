import { AlertCircle, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CatalogHealthBreakdown, ProductHealthRecord } from "@/src/domains/catalog-intelligence/types";
import { ProductDiagnosisType } from "@/src/domains/catalog-intelligence/types/enums";

const DIAGNOSIS_LABELS: Record<ProductDiagnosisType, string> = {
  [ProductDiagnosisType.NoImage]: "sem imagem",
  [ProductDiagnosisType.NoCategory]: "sem categoria",
  [ProductDiagnosisType.NoBrand]: "sem marca",
  [ProductDiagnosisType.NoDescription]: "sem descrição",
  [ProductDiagnosisType.NoPrice]: "sem preço",
  [ProductDiagnosisType.OutOfStock]: "sem estoque",
};

function buildIssueSummary(products: ProductHealthRecord[]): { type: ProductDiagnosisType; count: number }[] {
  const counts = new Map<ProductDiagnosisType, number>();
  for (const p of products) {
    for (const d of p.diagnoses) {
      counts.set(d.type, (counts.get(d.type) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

export function CatalogInsightsWidget({
  breakdown,
  products,
}: {
  breakdown: CatalogHealthBreakdown;
  products: ProductHealthRecord[];
}) {
  const issues = buildIssueSummary(products);
  const topIssue = issues[0];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="mb-4 text-sm font-semibold text-white">Insights do Catálogo</h3>

      {/* Top insight */}
      {breakdown.total === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-800/40 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-medium text-white">Nenhum produto publicado</p>
            <p className="mt-1 text-xs text-slate-500">
              Faça sua primeira importação para começar a aparecer para compradores.
            </p>
            <Link
              href="/merchant/imports/new"
              className="mt-3 flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300"
            >
              Importar produtos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : breakdown.health_score >= 80 ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div>
            <p className="text-sm font-medium text-white">Catálogo em excelente estado</p>
            <p className="mt-1 text-xs text-slate-500">
              {breakdown.ideal_pct}% dos produtos estão completos. Continue assim.
            </p>
          </div>
        </div>
      ) : topIssue ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-white">
              {topIssue.count} produto{topIssue.count > 1 ? "s" : ""} {DIAGNOSIS_LABELS[topIssue.type]}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Este é o principal bloqueio para melhorar a visibilidade do seu catálogo.
            </p>
            <Link
              href="/merchant/catalog"
              className="mt-3 flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300"
            >
              Corrigir agora <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : null}

      {/* Issue breakdown */}
      {issues.length > 0 && (
        <div className="mt-4 space-y-2">
          {issues.slice(0, 5).map(({ type, count }) => (
            <div key={type} className="flex items-center justify-between text-xs">
              <span className="text-slate-400 capitalize">{DIAGNOSIS_LABELS[type]}</span>
              <span className="tabular-nums text-slate-300">{count} produto{count > 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
