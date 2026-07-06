import { AdminDataTable, type Column } from "@/components/admin/ui/AdminDataTable";
import type { ConnectorHealthSummary } from "@/src/domains/connectors/services/ConnectorHealthService";

export function ConnectorHealthTable({ connectors }: { connectors: ConnectorHealthSummary[] | null }) {
  const cols: Column<ConnectorHealthSummary>[] = [
    { key: "name", header: "Conector" },
    { key: "storeSlug", header: "Loja" },
    {
      key: "healthScore",
      header: "Health",
      render: (c) => (
        <span className={c.healthScore >= 80 ? "text-emerald-400" : c.healthScore >= 50 ? "text-amber-400" : "text-red-400"}>
          {c.healthScore}/100
        </span>
      ),
    },
    { key: "uptime", header: "Uptime", render: (c) => `${c.uptime}%` },
    { key: "errorRate", header: "Erro", render: (c) => `${(c.errorRate * 100).toFixed(0)}%` },
    {
      key: "avgDurationSeconds",
      header: "Duração média",
      render: (c) => (c.avgDurationSeconds !== null ? `${c.avgDurationSeconds}s` : "—"),
    },
    { key: "importedItems", header: "Itens importados" },
    {
      key: "lastSyncAt",
      header: "Última sync",
      render: (c) => (c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString("pt-BR") : "Nunca"),
    },
  ];

  return (
    <AdminDataTable
      columns={cols}
      data={connectors ?? []}
      keyField="connectorKey"
      emptyMessage="Nenhum conector registrado ainda."
    />
  );
}
