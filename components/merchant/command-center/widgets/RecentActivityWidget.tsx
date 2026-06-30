import type { ExecutiveSummary } from "@/src/domains/merchant-intelligence/types";
import { CheckCircle2, XCircle, Package, RefreshCw } from "lucide-react";

interface Props {
  data: ExecutiveSummary;
}

interface ActivityItem {
  icon: typeof CheckCircle2;
  iconColor: string;
  title: string;
  detail: string;
  time: string;
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = item.icon;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon size={15} className={`mt-0.5 shrink-0 ${item.iconColor}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white">{item.title}</p>
        <p className="text-xs text-slate-400">{item.detail}</p>
      </div>
      <span className="shrink-0 text-xs text-slate-500">{item.time}</span>
    </div>
  );
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 7) return `Há ${days} dias`;
  if (days < 30) return `Há ${Math.floor(days / 7)} sem.`;
  return `Há ${Math.floor(days / 30)} mes.`;
}

export function RecentActivityWidget({ data }: Props) {
  const items: ActivityItem[] = [];

  // Last import
  if (data.lastImportAt) {
    items.push({
      icon: data.lastImportSuccess ? CheckCircle2 : XCircle,
      iconColor: data.lastImportSuccess ? "text-emerald-400" : "text-red-400",
      title: data.lastImportSuccess ? "Importação concluída" : "Importação falhou",
      detail: data.lastImportSuccess
        ? "Catálogo sincronizado com sucesso."
        : "Verifique o histórico de importações.",
      time: formatRelative(data.lastImportAt),
    });
  }

  // Products count
  if (data.totalProducts > 0) {
    items.push({
      icon: Package,
      iconColor: "text-blue-400",
      title: `${data.totalProducts} produto(s) publicados`,
      detail: `${data.activeProducts} ativos, ${data.incompleteProducts} incompletos.`,
      time: "Agora",
    });
  }

  // Reviews
  if (data.totalReviews > 0) {
    items.push({
      icon: CheckCircle2,
      iconColor: "text-amber-400",
      title: `${data.totalReviews} avaliação(ões)`,
      detail: data.averageRating !== null ? `Média: ${data.averageRating.toFixed(1)} ★` : "Sem média.",
      time: "Histórico",
    });
  }

  return (
    <section
      aria-label="Atividade Recente"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="mb-2 flex items-center gap-2">
        <RefreshCw size={14} className="text-slate-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Atividade Recente
        </h2>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Nenhuma atividade registrada ainda.
        </p>
      ) : (
        <div className="divide-y divide-slate-700/30">
          {items.map((item, i) => (
            <ActivityRow key={i} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
