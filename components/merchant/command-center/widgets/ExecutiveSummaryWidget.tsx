import type { ExecutiveSummary } from "@/src/domains/merchant-intelligence/types";
import { Package, ShieldCheck, Star, Phone, RefreshCw } from "lucide-react";

interface Props {
  data: ExecutiveSummary;
}

function StatCell({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-xs text-slate-400">{label}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}

export function ExecutiveSummaryWidget({ data }: Props) {
  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const incompleteColor =
    data.incompleteProducts === 0
      ? "text-emerald-400"
      : data.incompleteProducts / data.totalProducts > 0.3
      ? "text-red-400"
      : "text-amber-400";

  return (
    <section
      aria-label="Resumo Executivo"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
        Resumo Executivo
      </h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {/* Catalog */}
        <div className="col-span-1 flex flex-col gap-3 rounded-xl border border-slate-700/40 bg-slate-800/40 p-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Package size={14} />
            <span className="text-xs font-medium">Catálogo</span>
          </div>
          <StatCell label="Produtos" value={data.totalProducts} />
          <StatCell label="Ativos" value={data.activeProducts} />
          <div>
            <span className={`text-lg font-bold ${incompleteColor}`}>{data.incompleteProducts}</span>
            <span className="ml-1 text-xs text-slate-400">incompletos</span>
          </div>
        </div>

        {/* Trust */}
        <div className="col-span-1 flex flex-col gap-3 rounded-xl border border-slate-700/40 bg-slate-800/40 p-3">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck size={14} />
            <span className="text-xs font-medium">Trust</span>
          </div>
          <StatCell label="Trust Score" value={`${data.trustScore}%`} />
          <StatCell label="Verificações" value={data.verificationCount} />
          <StatCell label="Sinais ativos" value={data.activeSignalCount} />
        </div>

        {/* Reviews */}
        <div className="col-span-1 flex flex-col gap-3 rounded-xl border border-slate-700/40 bg-slate-800/40 p-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Star size={14} />
            <span className="text-xs font-medium">Avaliações</span>
          </div>
          <StatCell label="Total" value={data.totalReviews} />
          {data.averageRating !== null ? (
            <StatCell label="Média" value={`${data.averageRating.toFixed(1)} ★`} />
          ) : (
            <span className="text-xs text-slate-500">Sem avaliações ainda</span>
          )}
        </div>

        {/* Contact */}
        <div className="col-span-1 flex flex-col gap-3 rounded-xl border border-slate-700/40 bg-slate-800/40 p-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Phone size={14} />
            <span className="text-xs font-medium">Contato</span>
          </div>
          <StatCell
            label="Canais"
            value={`${data.contactsAvailable}/${data.contactsTotal}`}
            sub={data.contactsAvailable < data.contactsTotal ? "Incompleto" : "Completo"}
          />
        </div>

        {/* Last Update */}
        <div className="col-span-1 flex flex-col gap-3 rounded-xl border border-slate-700/40 bg-slate-800/40 p-3">
          <div className="flex items-center gap-2 text-slate-400">
            <RefreshCw size={14} />
            <span className="text-xs font-medium">Última Sync</span>
          </div>
          <StatCell
            label="Data"
            value={formatDate(data.lastImportAt)}
            sub={
              data.daysSinceLastImport !== null
                ? `Há ${data.daysSinceLastImport} dia(s)`
                : "Nunca sincronizado"
            }
          />
          {data.lastImportSuccess === false && (
            <span className="text-xs text-red-400">Sync com falha</span>
          )}
        </div>
      </div>
    </section>
  );
}
