import { AdminDataTable, type Column } from "@/components/admin/ui/AdminDataTable";
import type { ExchangeRate } from "@/src/domains/exchange/types/Money";

interface HistoryRow extends ExchangeRate {
  id: string;
}

export function RateHistoryTable({ history }: { history: ExchangeRate[] | null }) {
  const rows: HistoryRow[] = (history ?? []).map((r) => ({ ...r, id: `${r.pair}-${r.capturedAt}` }));

  const cols: Column<HistoryRow>[] = [
    { key: "capturedAt", header: "Data/Hora", render: (r) => new Date(r.capturedAt).toLocaleString("pt-BR") },
    { key: "pair", header: "Par" },
    { key: "rate", header: "Cotação", render: (r) => r.rate.toLocaleString("pt-BR", { maximumFractionDigits: 4 }) },
    { key: "source", header: "Fonte" },
  ];

  return (
    <AdminDataTable
      columns={cols}
      data={[...rows].reverse()}
      keyField="id"
      emptyMessage="Nenhum histórico de cotação nos últimos 7 dias."
    />
  );
}
