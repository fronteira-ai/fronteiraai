import { AdminDataTable, type Column } from "@/components/admin/ui/AdminDataTable";
import type { ProviderHealthSnapshot } from "@/src/domains/exchange/types/ProviderHealth";

const STATUS_COLOR: Record<string, string> = {
  healthy: "text-emerald-400",
  degraded: "text-amber-400",
  down: "text-red-400",
};

export function ProviderStatusTable({ providers }: { providers: ProviderHealthSnapshot[] | null }) {
  const cols: Column<ProviderHealthSnapshot>[] = [
    { key: "providerName", header: "Provedor" },
    { key: "priority", header: "Prioridade" },
    {
      key: "status",
      header: "Status",
      render: (p) => <span className={STATUS_COLOR[p.status] ?? ""}>{p.status}</span>,
    },
    { key: "healthScore", header: "Health", render: (p) => `${p.healthScore}/100` },
    { key: "uptime", header: "Uptime", render: (p) => `${p.uptime}%` },
    {
      key: "avgResponseTimeMs",
      header: "Latência média",
      render: (p) => (p.avgResponseTimeMs !== null ? `${p.avgResponseTimeMs}ms` : "—"),
    },
    {
      key: "lastSuccessAt",
      header: "Último sucesso",
      render: (p) => (p.lastSuccessAt ? new Date(p.lastSuccessAt).toLocaleString("pt-BR") : "Nunca"),
    },
  ];

  return (
    <AdminDataTable
      columns={cols}
      data={providers ?? []}
      keyField="providerId"
      emptyMessage="Nenhum provedor registrado ainda."
    />
  );
}
