import { AdminDataTable, type Column } from "@/components/admin/ui/AdminDataTable";
import type { MerchantPriorityScore } from "@/src/domains/marketplace-operations/types";

const TIER_STYLE: Record<string, string> = {
  diamond: "text-cyan-300",
  gold: "text-amber-400",
  silver: "text-slate-300",
  bronze: "text-orange-400",
};

export function MerchantPriorityTable({ priority }: { priority: MerchantPriorityScore[] | null }) {
  const cols: Column<MerchantPriorityScore>[] = [
    { key: "storeName", header: "Loja" },
    {
      key: "tier",
      header: "Tier",
      render: (p) => <span className={`font-medium uppercase text-xs ${TIER_STYLE[p.tier] ?? ""}`}>{p.tier}</span>,
    },
    { key: "businessClass", header: "Classe" },
    { key: "score", header: "Score", render: (p) => `${p.score}/100` },
    { key: "explanation", header: "Justificativa", className: "max-w-md text-xs text-slate-500" },
  ];

  return (
    <AdminDataTable
      columns={cols}
      data={priority ?? []}
      keyField="storeId"
      emptyMessage="Nenhuma loja cadastrada ainda."
    />
  );
}
